// Settings
DB_NAME = "deepamehta3-db"
SEARCH_FIELD_WIDTH = 16    // in chars
GENERIC_TOPIC_ICON_SRC = "images/gray-dot.png"

var db = new CouchDB(DB_NAME)
var ui = new UIHelper()

var current_doc         // topic document being displayed, or null if no one is currently displayed
var current_rel         // relation document being activated, or null if no one is currently activated
var canvas              // the canvas that displays the topic map (a Canvas object)
//
var plugin_sources = []
var plugins = []
var doctype_impls = []
var loaded_doctype_impls = {}
var css_stylesheets = []
//
var topic_type_icons = {}   // key: Type ID, value: icon (JavaScript Image object)
var generic_topic_icon = create_image(GENERIC_TOPIC_ICON_SRC)
topic_type_icons["Search Result"] = create_image("images/bucket.png")

// debug window
var debug = false
if (debug) {
    var debug_window = window.open()
}

// register core facilities
doctype_implementation("javascript/plain_document.js")
add_plugin("javascript/dm3_datafields.js")
add_plugin("javascript/dm3_fulltext.js")
// css_stylesheet("style/main.css")     // layout flatters while loading

$(document).ready(function() {
    // --- setup GUI ---
    $("#upper-toolbar").addClass("ui-widget-header").addClass("ui-corner-all")
    // the search form
    $("#searchmode_select_placeholder").replaceWith(searchmode_select())
    $("#search_field").attr({size: SEARCH_FIELD_WIDTH})
    $("#search-form").submit(search)
    ui.button("search_button", search, "Search", "gear")
    // the special form
    $("#special_select_placeholder").replaceWith(create_special_select())
    // the document form
    $("#document-form").submit(submit_document)
    //
    // Note: in order to let a plugin DOM manipulate the GUI
    // the plugins must be loaded _after_ the GUI is set up.
    load_plugins()
    trigger_hook("init")
    //
    // the create form
    $("#type_select_placeholder").replaceWith(create_type_menu("type_select"))
    ui.button("create_button", create_topic_from_menu, "Create", "plus")
    //
    ui.menu("searchmode_select", set_searchmode)
    ui.menu("special_select", special_selected, undefined, "Special")
    //
    detail_panel_width = $("#detail-panel").width()
    log("Detail panel width: " + detail_panel_width)
    //
    create_type_icons()
    //
    // Note: in order to avoid the canvas geometry being confused by DOM-
    // manipulating plugins it must be created _after_ the plugins are loaded.
    // (for some reason the canvas still gets confused, so we further postpone
    // its creation by waiting for the window being loaded completely.)
    $(window).resize(window_resized)
    $(window).load(function() {
        canvas = new Canvas()
        $("#detail-panel").height($("#canvas").height())
    })
})

function window_resized() {
    canvas.rebuild()
    $("#detail-panel").height($("#canvas").height())
}

function set_searchmode(searchmode) {
    var search_widget = trigger_hook("search_widget", searchmode.label)[0]
    //
    $("#search_widget").empty()
    $("#search_widget").append(search_widget)
}

function search() {
    try {
        //
        var searchmode = ui.menu_item("searchmode_select").label
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

function special_selected(menu_item) {
    var command = menu_item.label
    trigger_hook("handle_special_command", command)
}

/**
 * Reveals a document and optionally relate it to the current document.
 *
 * @param   do_relate   Optionally (boolean): if true a relation of type "Auxiliary" is created between
 *                      the document and the current document. If not specified false is assumed.
 */
function reveal_document(doc_id, do_relate) {
    // error check
    if (!document_exists(doc_id)) {
        alert("Document " + doc_id + " doesn't exist. Possibly it has been deleted.")
        return
    }
    // create relation
    if (do_relate) {
        var relation_doc = get_relation_doc(current_doc._id, doc_id)
        if (!relation_doc) {
            create_relation(current_doc._id, doc_id, true, "Auxiliary")
        } else {
            canvas.add_relation(relation_doc)
        }
    }
    // reveal document
    show_document(doc_id)
    canvas.add_document(current_doc, true)
    canvas.focus_topic(doc_id)
}

/**
 * Selects a document which is already visible on the canvas.
 * The document is displayed on the content panel and highlighted on the canvas.
 */
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
    trigger_doctype_hook("render_document", current_doc)
    //
    return true
}

function edit_document() {
    trigger_doctype_hook("render_document_form")
    trigger_doctype_hook("post_render_form")
}

function submit_document() {
    var submit_button = $("#document-form button[submit=true]")
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
    var topic_type = ui.menu_item("type_select").label
    current_doc = create_topic(topic_type)
    // update GUI
    canvas.add_document(current_doc, true)
    // initiate editing
    edit_document()
}

/**
 * Creates a topic document and stores it in the DB.
 *
 * @param   topic_type      the type as defined in the global type table ("types", see types.js).
 * @param   field_contents  optional - contents to override the default content (object, key: field id, value: content).
 *
 * @return  The topic document.
 */
function create_topic(topic_type, field_contents) {
    var typedef = clone(types[topic_type])
    var topic = create_raw_topic(topic_type, typedef.fields, typedef.view, typedef.implementation)
    // override default content
    if (field_contents) {
        for (var field_id in field_contents) {
            get_field(topic, field_id).content = field_contents[field_id]
        }
    }
    //
    save_document(topic)
    //
    return topic
}

/**
 * Creates a topic document in memory.
 *
 * This low-level approach allows to create a topic of a type which is not necessarily
 * defined in the global type table ("types", see types.js).
 *
 * @return  The topic document.
 */
function create_raw_topic(topic_type, fields, view, implementation) {
    return {
        type: "Topic",
        topic_type: topic_type,
        fields: fields,
        view: view,
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
 * Returns topics by ID list. Optionally filtered by topic type.
 *
 * @param   doc_ids         Array of topic IDs
 * @param   type_filter     a topic type, e.g. "Note", "Workspace"
 *
 * @return  Array of Topic objects
 */
function get_topics(doc_ids, type_filter) {
    var rows = db.view("deepamehta3/topics", null, doc_ids).rows
    //
    if (type_filter) {
        filter(rows, function(row) {
            return row.value.topic_type == type_filter
        })
    }
    //
    var topics = []
    for (var i = 0, row; row = rows[i]; i++) {
        topics.push(new Topic(row.id, row.value.topic_type, row.value.topic_label))
    }
    //
    return topics
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
 * Creates a relation in the DB and optionally adds it to the canvas model.
 * Note: the canvas view and the detail panel are not refreshed.
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
    // update GUI model
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
 * Deletes a relation from the DB, and from the canvas model.
 * Note: the canvas view and the detail panel are not refreshed.
 */
function delete_relation(rel_doc) {
    // update DB
    db.deleteDoc(rel_doc)
    // update GUI model
    canvas.remove_relation(rel_doc._id)
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

function javascript_source(source_path) {
    $("head").append($("<script>").attr("src", source_path))
}

/**************************************** Helper ****************************************/

function load_plugins() {
    // load plugins
    log("Loading " + plugin_sources.length + " plugins:")
    for (var i = 0, plugin_source; plugin_source = plugin_sources[i]; i++) {
        log("..... " + plugin_source)
        javascript_source(plugin_source)
        //
        var plugin_class = basename(plugin_source)
        log(".......... instantiating \"" + plugin_class + "\"")
        plugins.push(eval("new " + plugin_class))
    }
    // load doctype implementations
    log("Loading " + doctype_impls.length + " doctype implementations:")
    for (var i = 0, doctype_impl; doctype_impl = doctype_impls[i]; i++) {
        log("..... " + doctype_impl)
        javascript_source(doctype_impl)
        //
        var doctype_class = to_camel_case(basename(doctype_impl))
        log(".......... instantiating \"" + doctype_class + "\"")
        var doctype_impl = eval("new " + doctype_class)
        loaded_doctype_impls[doctype_class] = doctype_impl
        trigger_doctype_hook("init", undefined, doctype_impl)
    }
    // load CSS stylesheets
    log("Loading " + css_stylesheets.length + " CSS stylesheets:")
    for (var i = 0, css_stylesheet; css_stylesheet = css_stylesheets[i]; i++) {
        log("..... " + css_stylesheet)
        $("head").append($("<link>").attr({rel: "stylesheet", href: css_stylesheet, type: "text/css"}))
    }
}

/**
 * Triggers the named hook of all installed plugins.
 */
function trigger_hook(hook_name, args) {
    var result = []
    for (var i = 0, plugin; plugin = plugins[i]; i++) {
        if (plugin[hook_name]) {
            var res = plugin[hook_name](args)
            if (res != undefined) {
                result.push(res)
            }
        }
    }
    return result
}

//

function trigger_doctype_hook(hook_name, args, doctype_impl) {
    // if no doctype implementation is specified the one of the current document is used.
    if (!doctype_impl) {
        doctype_impl = loaded_doctype_impls[current_doc.implementation]
    }
    // trigger the hook only if it is defined (a doctype implementation must not define all hooks).
    // alert("trigger_doctype_hook: doctype=" + doctype_impl.name + " hook_name=" + hook_name + " hook=" + doctype_impl[hook_name])
    if (doctype_impl[hook_name]) {
        return doctype_impl[hook_name](args)
    }
}

function call_relation_function(function_name) {
    if (function_name == "delete_relation") {
        // update model
        delete_relation(current_rel)
        // update view
        canvas.refresh()
        show_document()
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

function create_type_menu(menu_id) {
    var type_menu = ui.menu(menu_id)
    for (var type in types) {
        // add type to menu
        ui.add_menu_item(menu_id, {label: type, icon: get_icon_src(type)})
    }
    return type_menu
}

function create_type_icons() {
    for (var type in types) {
        // create type icon
        topic_type_icons[type] = create_image(get_icon_src(type))
    }
}

function create_special_select() {
    return $("<select>").attr("id", "special_select")
}

//

/**
 * Creates a search result topic.
 *
 * @param   title           the title of the search result.
 * @param   result          the search result: either a CouchDB view result or a fulltext result.
 * @param   doctype_impl    the result topic's document type implementation.
 * @param   result_function a function that transforms a result row into a result item. A result item
 *                          object must contain the elements "id", "type", and "label" at least.
 *
 * @return  the result topic (a CouchDB document of type "Search Result")
 */
function create_result_topic(title, result, doctype_impl, result_function) {
    // create result topic
    var fields = [{id: "Title", content: '"' + title + '"'}]
    var view = {icon_src: "images/bucket.png"}
    var result_topic = create_raw_topic("Search Result", fields, view, doctype_impl)
    // add result items
    result_topic.items = []
    for (var i = 0, row; row = result.rows[i]; i++) {
        result_topic.items.push(result_function(row))
    }
    //
    return result_topic
}

//

/**
 * @param   topics      Topics to render (array of Topic objects).
 */
function render_topics(topics, render_function) {
    render_function = render_function || render_topic
    //
    var table = $("<table>")
    for (var i = 0, topic; topic = topics[i]; i++) {
        // icon
        var icon_td = $("<td>").addClass("topic-icon").addClass(i == topics.length - 1 ? "last-topic" : undefined)
        icon_td.append(render_topic_anchor(topic, type_icon_tag(topic.type, "type-icon")))
        // label
        var topic_td = $("<td>").addClass("topic-label").addClass(i == topics.length - 1 ? "last-topic" : undefined)
        topic_td.append(render_function(topic))
        //
        table.append($("<tr>").append(icon_td).append(topic_td))
    }
    return table
}

/**
 * @param   topic       Topic to render (a Topic object).
 */
function render_topic(topic) {
    return $("<div>").append(render_topic_anchor(topic, topic.label))
}

/**
* @param   topic       Topic to render (a Topic object).
 */
function render_topic_anchor(topic, anchor_content) {
    return $("<a>").attr({href: ""}).append(anchor_content).click(function() {
        reveal_document(topic.id, true)
        return false
    })
}

//

/**
 * @return  The <img> element (jQuery object).
 */
function type_icon_tag(type, class) {
    return image_tag(get_icon_src(type), class)
}

/**
 * @return  The <img> element (jQuery object).
 */
function image_tag(src, class) {
    return $("<img>").attr("src", src).addClass(class)
}

/**
 * Returns the icon source for a topic type.
 * If no icon is configured for that type the source of the generic topic icon is returned.
 *
 * @return  The icon source (string).
 */
function get_icon_src(type) {
    if (type == "Workspace") {
        return "vendor/dm3-workspaces/images/star.png"  // ### TODO: make Workspace a regular type
    // Note: types[type] is undefined if plugin is deactivated and content still exist.
    } else if (types[type] && types[type].view && types[type].view.icon_src) {
        return types[type].view.icon_src
    } else {
        return GENERIC_TOPIC_ICON_SRC
    }
}

/**
 * Returns the icon for a topic type.
 * If no icon is configured for that type the generic topic icon is returned.
 *
 * @return  The icon (JavaScript Image object)
 */
function get_type_icon(type) {
    var icon = topic_type_icons[type]
    return icon || generic_topic_icon
}

function create_image(src) {
    var img = new Image()
    img.src = src
    return img
}

//

function empty_detail_panel() {
    $("#detail-panel").empty()
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

/**
 * Returns the label for the topic.
 */
function topic_label(doc) {
    // if there is a view.label_field declaration use the content of that field
    if (doc.view) {
        var field_id = doc.view.label_field
        if (field_id) {
            return get_field(doc, field_id).content
        }
    }
    // fallback: use the content of the first field
    return doc.fields[0].content
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
 * Returns an array containing the keys of the object.
 */
function keys(object) {
    var a = []
    for (var key in object) {
        a.push(key)
    }
    return a
}

function inspect(object) {
    var str = "\n"
    for (var key in object) {
        str += key + ": " + object[key] + "\n"
    }
    return str
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

/**
 * Substracts array2 from array1.
 */
function substract(array1, array2, fn) {
    filter(array1, function(e1) {
         return !includes(array2, function(e2) {
             return fn(e1, e2)
         })
    })
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
            debug_window.document.writeln(render_text(text) + "<br>")
        }
    }
}

function render_text(text) {
    return text.replace(/\n/g, "<br>")
}

/**
 * @param   date    the date to format (string). If empty (resp. evaluates to false) an empty string is returned.
 *                  Otherwise it must be parsable by the Date constructor, e.g. "12/30/2009".
 */
function format_date(date) {
    // For possible format strings see http://docs.jquery.com/UI/Datepicker/formatDate
    return date ? $.datepicker.formatDate("D, M d, yy", new Date(date)) : ""
}

//

function Topic(id, type, label) {
    this.id = id
    this.type = type
    this.label = label
}
