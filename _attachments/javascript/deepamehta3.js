var db = new CouchDB("deepamehta3-db")

db.fulltext_search = function(index, text) {
    var viewPath = this.uri + "_fti/deepamehta3/" + index + "?q=" + text
    this.last_req = this.request("GET", viewPath)      
    if (this.last_req.status == 404)
        return null
    CouchDB.maybeThrowError(this.last_req)
    return JSON.parse(this.last_req.responseText)
}

var current_doc         // topic document being displayed, or null if no one is currently displayed
var current_rel         // relation document being activated, or null if no one is currently activated
var canvas
//
var plugin_sources = []
var plugins = []
var doctype_impls = []
var loaded_doctype_impls = {}
var css_stylesheets = []
//
var topic_type_icons = {}

// debug window
var debug = false
if (debug) {
    var debug_window = window.open()
}

// register core facilities
doctype_implementation("javascript/plain_document.js")
add_plugin("javascript/dm3_fulltext.js")
// css_stylesheet("style/main.css")     // layout flatters while loading

$(document).ready(function() {
    // --- setup GUI ---
    // search form
    $("#searchmode_select_placeholder").replaceWith(searchmode_select())
    $("#searchmode_select").change(set_searchmode)
    $("#search_form").submit(search)
    // special form
    $("#special_select_placeholder").replaceWith(create_special_select())
    // document form
    $("#document_form").submit(submit_document)
    //
    // Note: in order to let a plugin DOM manipulate the GUI
    // the plugins must be loaded _after_ the GUI is set up.
    load_plugins()
    trigger_hook("init")
    //
    // create form
    $("#type_select_placeholder").replaceWith(create_type_select())
    $("#create_button").click(create_topic_from_menu)
    //
    // Note: in order to avoid the canvas geometry being confused by DOM-
    // manipulating plugins it must be created _after_ the plugins are loaded.
    // (for some reason the canvas still gets confused, so we further postpone
    // its creation by waiting for the window being loaded completely.)
    $(window).load(function() {canvas = new Canvas()})
})

function set_searchmode() {
    //
    var searchmode = $("#searchmode_select").val()
    var search_widget = trigger_hook("search_widget", searchmode)[0]
    //
    $("#search_widget").empty()
    $("#search_widget").append(search_widget)
}

function search() {
    try {
        //
        var searchmode = $("#searchmode_select").val()
        var result_doc = trigger_hook("search", searchmode)[0]
        //
        save_document(result_doc)
        show_document(result_doc._id)
        canvas.add_document(current_doc, true)
    } catch (e) {
        alert("Error while searching: " + JSON.stringify(e))
    }
    return false
}

function special_selected() {
    var command = $("#special_select").val()
    trigger_hook("handle_special_command", command)
}

function reveal_document(doc_id) {
    if (document_exists(doc_id)) {
        var relation_doc = get_relation_doc(current_doc._id, doc_id)
        if (!relation_doc) {
            create_relation(current_doc._id, doc_id, true, "Auxiliary")
        } else {
            canvas.add_relation(relation_doc)
        }
        // update GUI
        show_document(doc_id)
        canvas.add_document(current_doc, true)
        canvas.focus_topic(doc_id)
    } else {
        alert("Document " + doc_id + " doesn't exist. Possibly it has been deleted.")
    }
}

function select_document(doc_id) {
    show_document(doc_id)
    canvas.refresh()
}

/**
 * Fetches the document and displays it on the content panel. Updates global state (current_doc),
 * provided the document could be fetched successfully.
 * If no document is specified, the current document is re-fetched.
 * If there is no current document the content panel is emptied.
 *
 * @return  true if the document could be fetched successfully, false otherwise.
 */
function show_document(doc_id) {
    if (doc_id == undefined) {
        if (current_doc) {
            doc_id = current_doc._id
        } else {
            empty_detail_panel()
            return false
        }
    }
    // fetch document
    var result = db.open(doc_id)
    //
    if (result == null) {
        return false
    }
    // update global state
    current_doc = result
    //
    empty_detail_panel()
    //
    var impl = loaded_doctype_impls[current_doc.implementation]
    if (impl) {
        impl.render_document(current_doc)
    // fallback
    } else {
        alert("show_document: implementation \"" + current_doc.implementation + "\" not found.\nFalling back to generic rendering.")
        $("#detail_panel").append(render_object(current_doc))
    }
    return true
}

function edit_document() {
    trigger_doctype_hook("render_document_form")
    trigger_doctype_hook("post_render_form")
}

function submit_document() {
    var submit_button = $("#document_form input[submit=true]")
    // alert("submit_document: submit button id=" + submit_button.attr("id"))
    submit_button.click()
    return false
}

function document_exists(doc_id) {
    return db.open(doc_id) != null
}



/****************************************************************************************/
/**************************************** Topics ****************************************/
/****************************************************************************************/



function create_topic_from_menu() {
    // update DB
    var topic_type = $("#type_select").val()
    var typedef = clone(types[topic_type])
    current_doc = create_topic(topic_type, typedef.fields, typedef.implementation, typedef.icon_src)
    // update GUI
    canvas.add_document(current_doc, true)
    // initiate editing
    edit_document()
}

/**
 * Creates a topic document and stores it to the DB.
 *
 * @return  The topic document.
 */
function create_topic(topic_type, fields, implementation, icon_src) {
    var topic_doc = create_topic_doc(topic_type, fields, implementation, icon_src)
    // update DB
    save_document(topic_doc)
    return topic_doc
}

/**
 * Just creates a topic document in memory.
 *
 * @return  The topic document.
 */
function create_topic_doc(topic_type, fields, implementation, icon_src) {
    return {
        type: "Topic",
        topic_type: topic_type,
        fields: fields,
        implementation: implementation,
        icon_src: icon_src
    }
}

function save_document(doc) {
    try {
        // trigger hook
        if (doc._id) {
            trigger_hook("pre_update", doc)
            var update = true
        } else {
            trigger_hook("pre_create", doc)
        }
        //
        // update DB
        db.save(doc)
        //
        // trigger hook
        if (update) {
            trigger_hook("post_update", doc)
        } else {
            trigger_hook("post_create", doc)
        }
    } catch (e) {
        alert("Error while saving: " + JSON.stringify(e))
    }
}

/**
 * Returns topics by ID list. Optionally filtered by topic type.
 *
 * @param   doc_ids         Array of topic IDs
 * @param   type_filter     a topic type, e.g. "Note", "Workspace"
 * @return  Array of CouchDB view rows: id,key=doc_id (the argument), value={name: , topic_type:}
 */
function get_topics(doc_ids, type_filter) {
    var rows = db.view("deepamehta3/topics", null, doc_ids).rows
    if (type_filter) {
        filter(rows, function(row) {
            return row.value.topic_type == type_filter
        })
    }
    return rows
}

/**
 * @param   delete_from_db  If true, the document (including its relations) is deleted permanently.
 *                          If false, the document (including its relations) is just removed from the view.
 */
function remove_document(delete_from_db) {
    // 1) delete relations
    remove_relations(current_doc, delete_from_db)
    // 2) delete document
    // update DB
    if (delete_from_db) {
        db.deleteDoc(current_doc)
    }
    // update GUI
    canvas.remove_document(current_doc._id, true)
    show_document()
}



/*******************************************************************************************/
/**************************************** Relations ****************************************/
/*******************************************************************************************/



/**
 * Creates a relation in the DB and optionally adds it also to the canvas.
 *
 * @param   rel_type    The type for the new relation. If not specified, "Relation" is used.
 */
function create_relation(doc1_id, doc2_id, add_to_canvas, rel_type) {
    // update DB
    var relation_doc = {
        type: "Relation",
        rel_type: rel_type || "Relation",
        rel_doc_ids: [doc1_id, doc2_id]
    }
    save_document(relation_doc)
    // update GUI
    if (add_to_canvas) {
        canvas.add_relation(relation_doc)
    }
}

/**
 * Returns the relation between the two documents. Optionally filtered by relation type.
 * If no such relation exists nothing is returned (undefined).
 * If more than one relation matches, only the first one is returned.
 *
 * @return  The relation, a CouchDB document.
 */
function get_relation_doc(doc1_id, doc2_id, rel_type) {
    if (rel_type) {
        var options = {key: [doc1_id, doc2_id, rel_type]}
    } else {
        var options = {startkey: [doc1_id, doc2_id], endkey: [doc1_id, doc2_id, {}]}
    }
    //
    var rows = db.view("deepamehta3/relation_undirected", options).rows
    //
    if (rows.length == 0) {
        return
    }
    if (rows.length > 1) {
        alert("get_relation_doc: there are " + rows.length + " relations between the two docs (1 is expected)\n" +
            "doc1=" + doc1_id + "\ndoc2=" + doc2_id + "\n(rel_type=" + rel_type + ")")
    }
    return db.open(rows[0].id)
}

/**
 * Returns the IDs of all relations of the document. Auxiliary relations are NOT included.
 *
 * @return  Array of relation IDs.
 */
function related_doc_ids(doc_id) {
    var rows = get_relations(doc_id)
    var rel_doc_ids = []
    for (var i = 0, row; row = rows[i]; i++) {
        rel_doc_ids.push(row.value.rel_doc_id)
    }
    return rel_doc_ids
}

/**
 * Returns all relations of the document. Optionally including auxiliary relations.
 * Auxialiary relations are not part of the knowledge base but help to visualize / navigate result sets.
 *
 * @return  Array of CouchDB view rows: id=relation ID, key=doc_id (the argument), value={rel_doc_id: , rel_doc_pos:, rel_type:}
 */
function get_relations(doc_id, include_auxiliary) {
    if (include_auxiliary) {
        var options = {startkey: [doc_id, 0], endkey: [doc_id, 1]}
    } else {
        var options = {key: [doc_id, 0]}
    }
    return db.view("deepamehta3/relations", options).rows
}

/**
 * Deletes a relation from the DB, refreshes the canvas and the detail panel.
 */
function delete_relation(rel_doc) {
    // update DB
    db.deleteDoc(rel_doc)
    // update GUI
    canvas.remove_relation(rel_doc._id, true)
    show_document()
}

function remove_relations(doc, delete_from_db) {
    var rows = get_relations(doc._id, true)
    for (var i = 0, row; row = rows[i]; i++) {
        // update DB
        if (delete_from_db) {
            db.deleteDoc(db.open(row.id))
        }
        // update GUI
        canvas.remove_relation(row.id)
    }
}



/************************************************************************************************/
/**************************************** Plugin Support ****************************************/
/************************************************************************************************/



function add_plugin(source_path) {
    plugin_sources.push(source_path)
}

function doctype_implementation(source_path) {
    doctype_impls.push(source_path)
}

function css_stylesheet(css_path) {
    css_stylesheets.push(css_path)
}

/**************************************** Helper ****************************************/

function load_plugins() {
    // load plugins
    log("Loading " + plugin_sources.length + " plugins:")
    for (var i = 0, plugin_source; plugin_source = plugin_sources[i]; i++) {
        log("..... " + plugin_source)
        $("head").append($("<script>").attr("src", plugin_source))
        //
        var plugin_class = basename(plugin_source)
        log(".......... instantiating \"" + plugin_class + "\"")
        plugins.push(eval("new " + plugin_class))
    }
    // load doctype implementations
    log("Loading " + doctype_impls.length + " doctype implementations:")
    for (var i = 0, doctype_impl; doctype_impl = doctype_impls[i]; i++) {
        log("..... " + doctype_impl)
        $("head").append($("<script>").attr("src", doctype_impl))
        //
        var doctype_class = to_camel_case(basename(doctype_impl))
        log(".......... instantiating \"" + doctype_class + "\"")
        var doctype_impl = eval("new " + doctype_class)
        loaded_doctype_impls[doctype_class] = doctype_impl
        trigger_doctype_hook("init", doctype_impl)
    }
    // load CSS stylesheets
    log("Loading " + css_stylesheets.length + " CSS stylesheets:")
    for (var i = 0, css_stylesheet; css_stylesheet = css_stylesheets[i]; i++) {
        log("..... " + css_stylesheet)
        $("head").append($("<link>").attr({rel: "stylesheet", href: css_stylesheet, type: "text/css"}))
    }
}

function trigger_hook(hook_name, args) {
    var result = []
    for (var i = 0, plugin; plugin = plugins[i]; i++) {
        if (plugin[hook_name]) {
            var res = plugin[hook_name](args)
            if (res) {
                result.push(res)
            }
        }
    }
    return result
}

//

function trigger_doctype_hook(hook_name, doctype_impl) {
    // if no doctype implementation is specified the one of the current document is used.
    if (!doctype_impl) {
        doctype_impl = loaded_doctype_impls[current_doc.implementation]
    }
    // trigger the hook only if it is defined (a doctype implementation must not define all hooks).
    // alert("trigger_doctype_hook: doctype=" + doctype_impl.name + " hook_name=" + hook_name + " hook=" + doctype_impl[hook_name])
    if (doctype_impl[hook_name]) {
        doctype_impl[hook_name]()
    }
}

function call_relation_function(function_name) {
    if (function_name == "delete_relation") {
        delete_relation(current_rel)
    } else {
        alert("call_relation_function: function \"" + function_name + "\" not implemented")
    }
}

// ---

// "vendor/dm3-time/script/dm3-time.js" -> "dm3-time"
function basename(path) {
    path.match(/.*\/(.*)\..*/)
    return RegExp.$1
}

function to_camel_case(str) {
    var res = ""
    var words = str.split("_")
    for (var i = 0, word; word = words[i]; i++) {
        res += word[0].toUpperCase()
        res += word.substr(1)
    }
    return res
}

// --- GUI ---

function searchmode_select() {
    return $("<select>").attr("id", "searchmode_select")
}

function create_type_select() {
    var select = $("<select>").attr("id", "type_select")
    for (var type in types) {
        select.append($("<option>").text(type))
        //
        if (types[type].icon_src) {
            topic_type_icons[type] = create_image(types[type].icon_src)
        }
    }
    //
    topic_type_icons["Search Result"] = create_image("images/bucket.png")
    //
    return select
}

function create_special_select() {
    var select = $("<select>").attr("id", "special_select").change(special_selected)
    select.append($("<option>").attr("value", "").text("Special:"))
    return select
}

//

function create_image(src) {
    var img = new Image()
    img.src = src
    return img
}

//

function empty_detail_panel() {
    $("#detail_panel").empty()
    $("#lower_toolbar").empty()
}

function render_object(object) {
    var table = $("<table>")
    for (var name in object) {
        var td1 = $("<td>").append(name)
        var td2 = $("<td>").append(object[name])
        table.append($("<tr>").append(td1).append(td2))
    }
    return table
}

//

function get_field(doc, field_id) {
    for (var i = 0, field; field = doc.fields[i]; i++) {
        if (field.id == field_id) {
            return field
        }
    }
}

// --- Utilities ---

/**
 * Filters array elements that match a filter function.
 * The array is manipulated in-place.
 */
function filter(array, fn) {
    var i = 0, e
    while (e = array[i]) {
        if (!fn(e)) {
            array.splice(i, 1)
            continue
        }
        i++
    }
}

/**
 * Returns true if the array contains a positive element according to the indicator function.
 */
function includes(array, fn) {
    for (var i = 0, e; e = array[i]; i++) {
        if (fn(e)) {
            return true
        }
    }
}

function clone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj))
    } catch (e) {
        log("### Error while cloning: " + JSON.stringify(e))
    }
}

function log(text) {
    if (debug) {
        // Note: the debug window might be closed meanwhile
        if (debug_window.document) {
            debug_window.document.writeln(text + "<br>")
        }
    }
}
