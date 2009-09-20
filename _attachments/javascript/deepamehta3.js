var db = new CouchDB("deepamehta3-db")

db.fulltext_search = function(text) {
    var viewPath = this.uri + "_fti/dm3/search?q=" + text
    this.last_req = this.request("GET", viewPath)      
    if (this.last_req.status == 404)
        return null
    CouchDB.maybeThrowError(this.last_req)
    return JSON.parse(this.last_req.responseText)
}

var current_doc         // document being displayed, or null if no one is currently displayed
var current_rel         // relation being activated (CanvasAssoc object)
var canvas
//
var plugin_sources = []
var plugins = []
var doctype_impls = []
var loaded_doctype_impls = {}
var css_stylesheets = []
//
var debug = false
var debug_window

function init() {
    // debug window
    if (debug) {
        debug_window = window.open()
    }
    // register core facilities
    doctype_implementation("javascript/plain_document.js")
    // css_stylesheet("style/main.css")
    //
    load_plugins()
    //
    // --- setup GUI ---
    canvas = new Canvas()
    // search form
    $("#searchmode_select_placeholder").replaceWith(searchmode_select())
    $("#searchmode_select").change(set_searchmode)
    $("#search_form").submit(search)
    // create
    $("#type_select_placeholder").replaceWith(create_type_select())
    $("#create_button").click(create_document)
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
        if (!relation_exists(current_doc, doc_id)) {
            create_relation(current_doc, doc_id)
        } else {
            canvas.add_relation(current_doc._id, doc_id)
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

function create_document() {
    current_doc = clone(types[$("#type_select").val()])
    save_document(current_doc)
    // update GUI
    canvas.add_document(current_doc, true)
    // initiate editing
    var impl = loaded_doctype_impls[current_doc.implementation]
    impl.edit_document()
}

function save_document(doc) {
    try {
        // trigger hook
        if (doc._id) {
            trigger_hook("pre_update", doc)
        } else {
            trigger_hook("pre_create", doc)
        }
        // update DB
        db.save(doc)
    } catch (e) {
        alert("error while saving: " + JSON.stringify(e))
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

//

/**
 * Creates a relation between the 2 documents.
 */
function create_relation(doc, rel_doc_id) {
    // 1) update DB
    // add to current topic
    if (!doc.related_ids) {
        doc.related_ids = []
    }
    doc.related_ids.push(rel_doc_id)
    save_document(doc)
    // add to related topic
    var related_doc = db.open(rel_doc_id)
    if (!related_doc.related_ids) {
        related_doc.related_ids = []
    }
    related_doc.related_ids.push(doc._id)
    save_document(related_doc)
    // 2) update GUI
    canvas.add_relation(doc._id, rel_doc_id)
}

function delete_relation() {
    // update DB
    var c1 = remove_related_id(current_rel.doc1_id, current_rel.doc2_id)
    var c2 = remove_related_id(current_rel.doc2_id, current_rel.doc1_id)
    // assertion
    if (c1 != c2) {
        alert("delete_relation: " + c1 + " vs. " + c2)
        return
    }
    // update GUI
    canvas.remove_relation(current_rel.id, true)
    show_document()
}

function remove_relations(doc, delete_from_db) {
    var rel_ids = doc.related_ids
    if (rel_ids) {
        for (var i = 0, rel_id; rel_id = rel_ids[i]; i++) {
            // update DB
            if (delete_from_db) {
                remove_related_id(rel_id, doc._id)
            }
            // update GUI
            canvas.remove_relation_by_topics(rel_id, doc._id)
        }
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
        delete_relation()
    } else {
        alert("call_relation_function: function \"" + function_name + "\" not implemented")
    }
}

//

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

function document_exists(doc_id) {
    return db.open(doc_id) != null
}

function relation_exists(doc, rel_doc_id) {
    return element_index(doc.related_ids, rel_doc_id) >= 0
}

//

function remove_related_id(doc_id, related_id) {
    var doc = db.open(doc_id)
    // assertion
    if (!doc.related_ids) {
        alert("remove_related_id: document has no relations")
        return
    }
    //
    var count = remove_element(doc.related_ids, related_id)
    // update DB
    save_document(doc)
    return count
}

// Removes all occurrences of the element in the array.
// Returns the number of removed elements.
function remove_element(array, elem) {
    var i = 0, count = 0, e
    while (e = array[i]) {
        if (e == elem) {
            array.splice(i, 1)
            count++
            continue
        }
        i++
    }
    return count
}

// FIXME: currently not used
/* function remove_element(array, elem) {
    var i = element_index(array, elem)
    if (i == -1) {
        alert("remove_element: " + elem + " not found in " + array)
    }
    array.splice(i, 1)
} */

function element_index(array, elem) {
    if (!array) {
        return -1
    }
    //
    for (var i = 0, e; e = array[i]; i++) {
        if (e == elem) {
            return i
        }
    }
    return -1
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function log(text) {
    if (debug) {
        debug_window.document.writeln(text + "<br>")
    }
}
