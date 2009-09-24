var db = new CouchDB("deepamehta3-db")

db.fulltext_search = function(text) {
    var viewPath = this.uri + "_fti/deepamehta3/search?q=" + text
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

// debug window
var debug = false
if (debug) {
    var debug_window = window.open()
}

// register core facilities
doctype_implementation("javascript/plain_document.js")
add_plugin("javascript/dm3_fulltext.js")
// css_stylesheet("style/main.css")     // layout flatters while loading

function init() {
    // Note: in order to avoid the canvas geometry being confused by
    // DOM-manipulating plugins it must be initialized _before_ the plugins are loaded.
    canvas = new Canvas()
    //
    // Note: in order to let a plugin extend the searchmode selector
    // the plugins must be loaded _before_ the GUI is set up.
    load_plugins()
    trigger_hook("init")
    //
    // --- setup GUI ---
    // search form
    $("#searchmode_select_placeholder").replaceWith(searchmode_select())
    $("#searchmode_select").change(set_searchmode)
    $("#search_form").submit(search)
    // create form
    $("#type_select_placeholder").replaceWith(create_type_select())
    $("#create_button").click(create_topic_from_menu)
}

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
        alert("error while searching: " + JSON.stringify(e))
    }
    return false
}

function reveal_document(doc_id) {
    if (document_exists(doc_id)) {
        var relation_doc = get_relation_doc(current_doc._id, doc_id)
        if (!relation_doc) {
            create_relation(current_doc._id, doc_id, true)
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

// --- Topics ---

function create_topic_from_menu() {
    // update DB
    var topic_type = $("#type_select").val()
    var typedef = clone(types[topic_type])
    current_doc = create_topic(topic_type, typedef.fields, typedef.implementation)
    // update GUI
    canvas.add_document(current_doc, true)
    // initiate editing
    var impl = loaded_doctype_impls[current_doc.implementation]
    impl.edit_document()
}

/**
 * Creates a topic document and stores it to the DB.
 *
 * @return  The topic document.
 */
function create_topic(topic_type, fields, implementation) {
    var topic_doc = create_topic_doc(topic_type, fields, implementation)
    // update DB
    save_document(topic_doc)
    return topic_doc
}

/**
 * Just creates a topic document in memory.
 *
 * @return  The topic document.
 */
function create_topic_doc(topic_type, fields, implementation) {
    return {
        type: "Topic",
        topic_type: topic_type,
        fields: fields,
        implementation: implementation
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

// --- Relations ---

/**
 * Creates a relation in the DB and adds it to the canvas.
 */
function create_relation(doc1_id, doc2_id, add_to_canvas) {
    // update DB
    var relation_doc = {
        type: "Relation",
        rel_type: "Relation",
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
    var rows = relations(doc._id)
    for (var i = 0, row; row = rows[i]; i++) {
        // update DB
        if (delete_from_db) {
            db.deleteDoc(db.open(row.id))
        }
        // update GUI
        canvas.remove_relation(row.id)
    }
}

// --- Plugin Mechanism ---

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
        log(plugin_source)
        $("head").append($("<script>").attr("src", plugin_source))
        //
        var plugin_class = basename(plugin_source)
        log("instantiating \"" + plugin_class + "\"")
        plugins.push(eval("new " + plugin_class))
    }
    // load document type implementations
    log("Loading " + doctype_impls.length + " document type implementations:")
    for (var i = 0, doctype_impl; doctype_impl = doctype_impls[i]; i++) {
        log(doctype_impl)
        $("head").append($("<script>").attr("src", doctype_impl))
        //
        var doctype_class = to_camel_case(basename(doctype_impl))
        log("instantiating \"" + doctype_class + "\"")
        loaded_doctype_impls[doctype_class] = eval("new " + doctype_class)
    }
    // load CSS stylesheets
    log("Loading " + css_stylesheets.length + " CSS stylesheets:")
    for (var i = 0, css_stylesheet; css_stylesheet = css_stylesheets[i]; i++) {
        log(css_stylesheet)
        $("head").append($("<link>").attr({rel: "stylesheet", href: css_stylesheet, type: "text/css"}))
    }
}

function trigger_hook(name, args) {
    var result = []
    for (var i = 0, plugin; plugin = plugins[i]; i++) {
        if (plugin[name]) {
            var res = plugin[name](args)
            if (res) {
                result.push(res)
            }
        }
    }
    return result
}

//

function call_document_function(function_name) {
    var impl = loaded_doctype_impls[current_doc.implementation]
    impl[function_name]()
}

function call_relation_function(function_name) {
    if (function_name == "delete_relation") {
        delete_relation(current_rel)
    } else {
        alert("call_relation_function: function \"" + function_name + "\" not implemented")
    }
}

// --- DB ---

function related_doc_ids(doc_id) {
    var rows = relations(doc_id)
    var rel_doc_ids = []
    for (var i = 0, row; row = rows[i]; i++) {
        rel_doc_ids.push(row.value.rel_doc_id)
    }
    return rel_doc_ids
}

/**
 * Returns all relations of the document.
 *
 * @return  Array of CouchDB view rows: id=relation ID, key=doc_id (the argument), value={rel_doc_id: , rel_doc_pos:, rel_type:}
 */
function relations(doc_id) {
    return db.view("deepamehta3/relations", {key: doc_id}).rows
}

/**
 * Returns topics by ID list. Optionally filtered by topic type.
 *
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

function document_exists(doc_id) {
    return db.open(doc_id) != null
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
    //
    var searchmodes = trigger_hook("searchmode")
    //
    var select = $("<select>").attr("id", "searchmode_select")
    for (var i = 0, searchmode; searchmode = searchmodes[i]; i++) {
        select.append($("<option>").text(searchmode))
    }
    return select
}

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

function doc_field(doc, field_id) {
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
    return JSON.parse(JSON.stringify(obj))
}

function log(text) {
    if (debug) {
        debug_window.document.writeln(text + "<br>")
    }
}
