// Settings
var DB_NAME = "deepamehta3-db"
var SEARCH_FIELD_WIDTH = 16    // in chars
var GENERIC_TOPIC_ICON_SRC = "images/gray-dot.png"

var OPEN_LOG_WINDOW = true
var LOG_PLUGIN_LOADING = false

var db = new CouchDB(DB_NAME)
var ui = new UIHelper()

var current_doc         // topic document being displayed, or null if no one is currently displayed (a CouchDB document)
var current_rel_id      // ID of relation being activated, or null if no one is currently activated
var canvas              // the canvas that displays the topic map (a Canvas object)
var is_form_shown       // true if a form is shown (used to fire the "post_submit_form" event)
//
var plugin_sources = []
var plugins = []
var doctype_impl_sources = []
var doctype_impls = {}
var css_stylesheets = []
//
var topic_types = {}        // key: Type ID, value: type definition (object with "fields", "view", and "implementation" attributes)
var topic_type_icons = {}   // key: Type ID, value: icon (JavaScript Image object)
var generic_topic_icon = create_image(GENERIC_TOPIC_ICON_SRC)
topic_type_icons["Search Result"] = create_image("images/bucket.png")

// log window
if (OPEN_LOG_WINDOW) {
    var log_window = window.open()
}

// --- register core facilities ---
// Note: the core plugins must be registered _before_ the vendor plugins (so, we must not
// put the add_plugin calls in the document ready handler).
// The DM3 Time plugin, e.g. derives its TimeSearchResult from SearchResult (part of
// DM3 Fulltext core plugin). The base class must load first.
doctype_implementation("javascript/plain_document.js")
add_plugin("javascript/dm3_fulltext.js")
add_plugin("javascript/dm3_datafields.js")
add_plugin("javascript/dm3_types.js")
add_plugin("javascript/dm3_tinymce.js")
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
    detail_panel_width = $("#detail-panel").width()
    log("Detail panel width: " + detail_panel_width)
    //
    canvas = new Canvas()
    //
    // Note: in order to let a plugin DOM manipulate the GUI
    // the plugins must be loaded _after_ the GUI is set up.
    // alert("Plugins:\n" + plugin_sources.join("\n"))
    load_plugins()
    //
    trigger_hook("init")
    //
    // the create form
    $("#create-type-menu-placeholder").replaceWith(create_type_menu("create-type-menu").dom)
    ui.button("create_button", create_topic_from_menu, "Create", "plus")
    //
    ui.menu("searchmode_select", set_searchmode)
    ui.menu("special_select", special_selected, undefined, "Special")
    //
    $(window).resize(window_resized)
    $(window).load(function() {
        $("#detail-panel").height($("#canvas").height())
    })
})

function window_resized() {
    canvas.rebuild()
    $("#detail-panel").height($("#canvas").height())
}

function set_searchmode(menu_item) {
    var searchmode = menu_item.label
    var search_widget = trigger_hook("search_widget", searchmode)[0]
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
        add_topic_to_canvas(current_doc)
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
 * @param   do_relate   Optional (boolean): if true a relation of type "Auxiliary" is created between
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
        var relation = get_relation_doc(current_doc._id, doc_id)
        if (!relation) {
            relation = create_relation("Auxiliary", current_doc._id, doc_id)
        }
        canvas.add_relation(relation._id, relation.rel_doc_ids[0], relation.rel_doc_ids[1])
    }
    // reveal document
    show_document(doc_id)
    add_topic_to_canvas(current_doc)
    canvas.focus_topic(doc_id)
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
    var doc = db.open(doc_id)
    //
    if (doc == null) {
        return false
    }
    //
    empty_detail_panel()
    // update global state
    current_doc = doc
    //
    trigger_doctype_hook(current_doc, "render_document", current_doc)
    //
    return true
}

function edit_document() {
    trigger_doctype_hook(current_doc,      "render_form", current_doc)
    trigger_doctype_hook(current_doc, "post_render_form", current_doc)
}

function submit_document() {
    var submit_button = $("#document-form button[submit=true]")
    // alert("submit_document: submit button id=" + submit_button.attr("id"))
    submit_button.click()
    return false
}



/****************************************************************************************/
/**************************************** Topics ****************************************/
/****************************************************************************************/



function create_topic_from_menu() {
    // update DB
    var topic_type = ui.menu_item("create-type-menu").label
    current_doc = create_topic(topic_type)
    // update GUI
    add_topic_to_canvas(current_doc)
    // initiate editing
    edit_document()
}

/**
 * Creates a topic document and stores it in the DB.
 *
 * @param   topic_type          The type ID, e.g. "Note".
 * @param   field_contents      Optional: contents to override the default content (object, key: field ID, value: content).
 * @param   extra_attributes    Optional: proprietary attributes to be added to the topic (object).
 *
 * @return  The topic document as stored in the DB.
 */
function create_topic(topic_type, field_contents, extra_attributes) {
    var typedef = clone(topic_types[topic_type])
    var topic = create_raw_topic(topic_type, typedef.fields, typedef.view, typedef.implementation)
    // override default content
    for (var field_id in field_contents) {
        get_field(topic, field_id).content = field_contents[field_id]
    }
    // add extra attributes
    for (var attr_name in extra_attributes) {
        topic[attr_name] = extra_attributes[attr_name]
    }
    //
    save_document(topic)
    //
    return topic
}

/**
 * Creates a topic document in memory. Low-level method.
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
        alert("Error while saving: " + JSON.stringify(e).replace(/\\n/g, "\n"))
    }
}

/**
 * Returns topics by ID list. Optionally filtered by topic type.
 *
 * @param   doc_ids         Array of topic IDs.
 * @param   type_filter     Optional: a topic type, e.g. "Note", "Workspace".
 *
 * @return  Array of Topic objects.
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
 * Returns topics by type.
 *
 * @param   type_filter     A topic type, e.g. "Note", "Workspace".
 *
 * @return  Array of Topic objects.
 */
function get_topics_by_type(type_filter) {
    var rows = db.view("deepamehta3/by_type", {key: type_filter}).rows
    //
    var topics = []
    for (var i = 0, row; row = rows[i]; i++) {
        topics.push(new Topic(row.id, row.key, row.value))
    }
    //
    return topics
}

/**
 * Returns all relations of the document. Optionally including auxiliary relations.
 * Hint: Auxialiary relations are not part of the knowledge base but help to visualize / navigate result sets.
 *
 * @return  Array of CouchDB view rows: id=relation ID, key=doc_id (the argument), value={rel_doc_id: , rel_doc_pos:, rel_type:}
 */
function get_related_topics(doc_id, include_auxiliary) {
    if (include_auxiliary) {
        var options = {startkey: [doc_id, 0], endkey: [doc_id, 1]}
    } else {
        var options = {key: [doc_id, 0]}
    }
    return db.view("deepamehta3/related_topics", options).rows
}

/**
 * Removes the current document and all its relations.
 *
 * @param   delete_from_db  If true, the document and relations are deleted permanently.
 *                          If false, the document and relations are just removed from the view (canvas).
 */
function remove_document(delete_from_db) {
    // 1) delete relations
    remove_relations(current_doc, delete_from_db)
    // 2) delete document
    // update DB
    if (delete_from_db) {
        db.deleteDoc(current_doc)
    }
    // update model
    var tmp_doc = current_doc
    current_doc = null
    // update GUI
    canvas.remove_topic(tmp_doc._id, true)
    show_document()
    // trigger hooks
    if (delete_from_db) {
        trigger_hook("post_delete", tmp_doc)
    } else {
        trigger_hook("post_hide_topic_from_canvas", tmp_doc._id)
    }
}



/*******************************************************************************************/
/**************************************** Relations ****************************************/
/*******************************************************************************************/



/**
 * Creates a relation document and stores it in the DB.
 *
 * @param   rel_type        The relation type, e.g. "Relation", "Auxiliary".
 * @param   extra_fields    Optional: extra fields to be added to the relation (an object).
 *
 * @return  The relation document as stored in the DB.
 */
function create_relation(rel_type, doc1_id, doc2_id, extra_fields) {
    var relation = {
        type: "Relation",
        rel_type: rel_type,
        rel_doc_ids: [doc1_id, doc2_id]
    }
    // add extra fields
    for (var key in extra_fields) {
        relation[key] = extra_fields[key]
    }
    //
    save_document(relation)
    //
    return relation
}

/**
 * Returns relations by ID list.
 *
 * @param   rel_ids         Array of relation IDs.
 *
 * @return  Array of Relation objects
 */
function get_relations(rel_ids) {
    var rows = db.view("deepamehta3/relations", null, rel_ids).rows
    //
    var relations = []
    for (var i = 0, row; row = rows[i]; i++) {
        relations.push(new Relation(row.id, row.value.rel_type, row.value.doc1_id, row.value.doc2_id))
    }
    //
    return relations
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
    var rows = get_related_topics(doc_id)
    var rel_doc_ids = []
    for (var i = 0, row; row = rows[i]; i++) {
        rel_doc_ids.push(row.value.rel_doc_id)
    }
    return rel_doc_ids
}

/**
 * Deletes a relation from the DB, and from the view (canvas).
 * Note: the canvas view and the detail panel are not refreshed.
 */
function delete_relation(rel_id) {
    // update DB
    db.deleteDoc(db.open(rel_id))
    // update GUI
    canvas.remove_relation(rel_id)
}

/**
 * Removes all relations the topic (doc) is involved in.
 *
 * @param   delete_from_db  If true, the relations are deleted permanently.
 *                          If false, the relations are just removed from the view (canvas).
 */
function remove_relations(doc, delete_from_db) {
    var rows = get_related_topics(doc._id, true)
    for (var i = 0, row; row = rows[i]; i++) {
        // update DB
        if (delete_from_db) {
            var relation = db.open(row.id)
            if (relation) {
                db.deleteDoc(relation)
            } else {
                // Note: this can happen, but is no problem, if topicmaps contain themself.
                var text = "ERROR at remove_relations: \"" + row.value.rel_type + "\" relation (" + row.id +
                    ") of topic \"" + topic_label(doc) + "\" (" + doc._id + ") not found in DB."
                log(text)
                // FIXME: the core should be independant from the DM3 Topicmaps plugin.
                if (doc.topic_type != "Topicmap") {
                    alert(text)
                }
            }
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

function add_topic_type(type_id, typedef) {
    topic_types[type_id] = typedef
    topic_type_icons[type_id] = create_image(get_icon_src(type_id))
}

function remove_topic_type(type_id) {
    delete topic_types[type_id]
}

function doctype_implementation(source_path) {
    doctype_impl_sources.push(source_path)
}

function css_stylesheet(css_path) {
    css_stylesheets.push(css_path)
}

function javascript_source(source_path) {
    $("head").append($("<script>").attr("src", source_path))
}

/**************************************** Helper ****************************************/

function load_plugins() {
    // 1) load plugins
    if (LOG_PLUGIN_LOADING) log("Loading " + plugin_sources.length + " plugins:")
    for (var i = 0, plugin_source; plugin_source = plugin_sources[i]; i++) {
        if (LOG_PLUGIN_LOADING) log("..... " + plugin_source)
        javascript_source(plugin_source)
        //
        var plugin_class = basename(plugin_source)
        if (LOG_PLUGIN_LOADING) log(".......... instantiating \"" + plugin_class + "\"")
        plugins.push(eval("new " + plugin_class))
    }
    // 2) load doctype implementations
    if (LOG_PLUGIN_LOADING) log("Loading " + doctype_impl_sources.length + " doctype implementations:")
    for (var i = 0, doctype_impl_src; doctype_impl_src = doctype_impl_sources[i]; i++) {
        load_doctype_impl(doctype_impl_src)
    }
    // 3) load CSS stylesheets
    if (LOG_PLUGIN_LOADING) log("Loading " + css_stylesheets.length + " CSS stylesheets:")
    for (var i = 0, css_stylesheet; css_stylesheet = css_stylesheets[i]; i++) {
        if (LOG_PLUGIN_LOADING) log("..... " + css_stylesheet)
        $("head").append($("<link>").attr({rel: "stylesheet", href: css_stylesheet, type: "text/css"}))
    }
}

function load_doctype_impl(doctype_impl_src) {
    if (LOG_PLUGIN_LOADING) log("..... " + doctype_impl_src)
    javascript_source(doctype_impl_src)
    //
    var doctype_class = to_camel_case(basename(doctype_impl_src))
    if (LOG_PLUGIN_LOADING) log(".......... instantiating \"" + doctype_class + "\"")
    var doctype_impl = eval("new " + doctype_class)
    doctype_impls[doctype_class] = doctype_impl
}

// ---

/**
 * Triggers the named hook of all installed plugins.
 *
 * @param   hook_name   Name of the plugin hook to trigger.
 * @param   <varargs>   Variable number of arguments. Passed to the hook.
 */
function trigger_hook(hook_name) {
    var result = []
    for (var i = 0, plugin; plugin = plugins[i]; i++) {
        if (plugin[hook_name]) {
            // 1) Trigger hook
            if (arguments.length == 1) {
                var res = plugin[hook_name]()
            } else if (arguments.length == 2) {
                var res = plugin[hook_name](arguments[1])
            } else if (arguments.length == 3) {
                var res = plugin[hook_name](arguments[1], arguments[2])
            } else if (arguments.length == 4) {
                var res = plugin[hook_name](arguments[1], arguments[2], arguments[3])
            } else {
                alert("ERROR at trigger_hook: too much arguments (" +
                    (arguments.length - 1) + "), maximum is 2.\nhook=" + hook_name)
            }
            // 2) Store result
            // Note: undefined is not added to the result, but null is.
            // typeof is required because null==undefined !
            if (typeof(res) != "undefined") {
                result.push(res)
            }
        }
    }
    return result
}

function trigger_doctype_hook(doc, hook_name, args) {
    // Lookup implementation
    var doctype_impl = doctype_impls[doc.implementation]
    // Trigger the hook only if it is defined (a doctype implementation must not define all hooks).
    // alert("trigger_doctype_hook: doctype=" + doctype_impl.name + " hook_name=" + hook_name + " hook=" + doctype_impl[hook_name])
    if (doctype_impl[hook_name]) {
        return doctype_impl[hook_name](args)
    }
}

function call_relation_function(function_name) {
    if (function_name == "delete_relation") {
        // update model
        delete_relation(current_rel_id)
        // update view
        canvas.refresh()
        show_document()
    } else {
        alert("call_relation_function: function \"" + function_name + "\" not implemented")
    }
}

// --- DB ---

function document_exists(doc_id) {
    return db.open(doc_id) != null
}

// --- GUI ---

function searchmode_select() {
    return $("<select>").attr("id", "searchmode_select")
}

function create_type_menu(menu_id, handler) {
    var type_menu = ui.menu(menu_id, handler)
    for (var type in topic_types) {
        // add type to menu
        type_menu.add_item({label: type, value: type, icon: get_icon_src(type)})
    }
    return type_menu
}

function rebuild_type_menu(menu_id) {
    var selection = ui.menu_item(menu_id).value
    $("#" + menu_id).replaceWith(create_type_menu(menu_id))
    ui.select_menu_item(menu_id, selection)
}

function create_special_select() {
    return $("<select>").attr("id", "special_select")
}

//

/**
 * Creates a search result topic.
 *
 * @param   title               The title of the search result.
 * @param   result              The search result: either
 *                              1) a CouchDB view result (array of row objects),
 *                              2) a fulltext result (array of row objects),
 *                              3) an array of Topic objects.
 * @param   doctype_impl        The result topic's document type implementation.
 * @param   result_function     Optional: a function that transforms a result row into a result item.
 *                              A result item object must at least contain the attributes "id", "type", and "label".
 *                              If not specified, the result objects are expected to be valid result items already.
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
    for (var i = 0, row; row = result[i]; i++) {
        result_topic.items.push(result_function && result_function(row) || row)
    }
    //
    return result_topic
}

//

/**
 * Adds the topic to the canvas, highlights it, and refreshes the canvas.
 *
 * @param   doc     a topic document
 */
function add_topic_to_canvas(doc) {
    canvas.add_topic(doc._id, doc.topic_type, topic_label(doc), true, true)
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
    // Note: topic_types[type] is undefined if plugin is deactivated and content still exist.
    } else if (topic_types[type] && topic_types[type].view && topic_types[type].view.icon_src) {
        return topic_types[type].view.icon_src
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
    img.src = src   // Note: if src is a relative URL JavaScript extends img.src to an absolute URL
    img.onload = function(arg0) {
        // Note: "this" is the image. The argument is the "load" event.
        log("Image ready: " + src /* + " " + img.src + "\n..... this=" + inspect(this) + "\n..... arg0=" + inspect(arg0) */)
        notify_image_trackers()
    }
    return img
}

//

function empty_detail_panel(is_form) {
    if (is_form_shown) {
        trigger_hook("post_submit_form", current_doc)
    }
    is_form_shown = is_form
    //
    $("#detail-panel").empty()
    $("#lower-toolbar").empty()
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

function get_field_index(doc, field_id) {
    for (var i = 0, field; field = doc.fields[i]; i++) {
        if (field.id == field_id) {
            return i
        }
    }
}

function remove_field(doc, field_id) {
    var i = get_field_index(doc, field_id)
    // error check 1
    if (i == undefined) {
        alert("ERROR at remove_field: field with ID \"" + field_id +
            "\" not found in fields " + JSON.stringify(doc.fields))
        return
    }
    //
    doc.fields.splice(i, 1)
    // error check 2
    if (get_field_index(doc, field_id) >= 0) {
        alert("ERROR at remove_field: more than one field with ID \"" +
            field_id + "\" found")
        return
    }
}

function get_value(doc, field_id) {
    return get_field(doc, field_id).content
}

/**
 * Returns the label for the topic.
 */
function topic_label(doc) {
    // if there is a view.label_field declaration use the content of that field
    if (doc.view) {
        var field_id = doc.view.label_field
        if (field_id) {
            return get_value(doc, field_id)
        }
    }
    // fallback: use the content of the first field
    return doc.fields[0].content
}

function field_label(field) {
    // Note: the "view" element is optional, e.g. for a "date" field
    return field.view && field.view.label ? field.view.label : field.id
}



// *****************
// *** Utilities ***
// *****************



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

function id_list(array) {
    var ids = []
    for (var i = 0, e; e = array[i]; i++) {
        ids.push(e.id)
    }
    return ids
}

/* FIXME: not in use
function size(object) {
    var size = 0
    for (var key in object) {
        size++
    }
    return size
} */

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
        alert("ERROR while cloning: " + JSON.stringify(e))
    }
}

function log(text) {
    if (OPEN_LOG_WINDOW) {
        // Note: the log window might be closed meanwhile
        if (log_window.document) {
            log_window.document.writeln(render_text(text) + "<br>")
        }
    }
}

// === Text Utilities ===

function render_text(text) {
    return text.replace(/\n/g, "<br>")
}

/**
 * "vendor/dm3-time/script/dm3-time.js" -> "dm3-time"
 */
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

/**
 * "Type ID" -> "type-id"
 */
function to_id(str) {
    str = str.toLowerCase()
    str = str.replace(/ /g, "-")
    return str
}

/**
 * @param   date    the date to format (string). If empty (resp. evaluates to false) an empty string is returned.
 *                  Otherwise it must be parsable by the Date constructor, e.g. "12/30/2009".
 */
function format_date(date) {
    // For possible format strings see http://docs.jquery.com/UI/Datepicker/formatDate
    return date ? $.datepicker.formatDate("D, M d, yy", new Date(date)) : ""
}

/*** Helper Classes ***/

function Topic(id, type, label) {
    this.id = id
    this.type = type
    this.label = label
}

function Relation(id, type, doc1_id, doc2_id) {
    this.id = id
    this.type = type
    this.doc1_id = doc1_id
    this.doc2_id = doc2_id
}

// === Image Tracker ===

var image_tracker

function create_image_tracker(callback_func) {

    return image_tracker = new ImageTracker()

    function ImageTracker() {

        var types = []      // topic types whose images are tracked

        this.add_type = function(type) {
            if (types.indexOf(type) == -1) {
                types.push(type)
            }
        }

        // Checks if the tracked images are loaded completely.
        // If so, the callback is triggered and this tracker is removed.
        this.check = function() {
            if (types.every(function(type) {return get_type_icon(type).complete})) {
                callback_func()
                image_tracker = undefined
            }
        }
    }
}

function notify_image_trackers() {
    image_tracker && image_tracker.check()
}
