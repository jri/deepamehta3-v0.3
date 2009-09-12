var db = new CouchDB("technotes-db")

db.fulltext_search = function(text) {
    var viewPath = this.uri + "_fti/technotes/search?q=" + text
    this.last_req = this.request("GET", viewPath)      
    if (this.last_req.status == 404)
        return null
    CouchDB.maybeThrowError(this.last_req)
    return JSON.parse(this.last_req.responseText)
}

var current_doc         // document being displayed, or null if no one is currently displayed
var current_rel         // relation being activated (CanvasAssoc object)
var canvas
var implementations = {}
var debug_window

function init() {
    canvas = new Canvas()
    //
    $("#search_form").submit(search)                                    // search form
    $("#type_select_placeholder").replaceWith(create_type_select())     // type select
    $("#create_button").click(create_document)                          // create button
    //
    for (var i = 0, implementation_class; implementation_class = implementation_classes[i]; i++) {
        implementations[implementation_class] = eval("new " + implementation_class)
    }
    // debug window
    // debug_window = window.open()
}

function search() {
    try {
        var searchterm = $("#search_field").val()
        var result = db.fulltext_search(searchterm)
        // build result document
        result_doc = {fields: [{id: "Title", content: '"' + searchterm + '"'}], implementation: "SearchResult", items: []}
        for (var i = 0, row; row = result.rows[i]; i++) {
            result_doc.items.push({"id": row.id, "title": row.fields ? row.fields["Title"] : "?"})
        }
        //
        db.save(result_doc)
        //
        show_document(result_doc._id)
        canvas.add_document(current_doc, true)
    } catch (e) {
        alert("error while searching: " + JSON.stringify(e))
    }
    return false
}

function reveal_document(doc_id) {
    if (show_document(doc_id)) {
        if (!canvas.contains(doc_id)) {
            canvas.add_document(current_doc)
        }
        canvas.refresh()    // highlight
    }
}

function select_document(doc_id) {
    show_document(doc_id)
    canvas.refresh()
}

// Fetches the document and displays it on the content panel. Updates global state (current_doc), provided the document could
// be fetched successfully. Returns true if the document could be fetched successfully, false otherwise.
// If no document is specified, the current document is re-fetched. If there is no current document the content panel is emptied.
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
        alert("Document " + doc_id + " doesn't exist.\nPossibly it has been deleted.")
        return false
    }
    // update global state
    current_doc = result
    //
    empty_detail_panel()
    //
    var impl = implementations[current_doc.implementation]
    if (impl) {
        impl.render_document(current_doc)
    // fallback
    } else {
        alert("show_document: fallback")
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
    var impl = implementations[current_doc.implementation]
    impl.edit_document()
}

function save_document(doc) {
    // alert("save document: " + JSON.stringify(doc))
    try {
        var result = db.save(doc)
        // alert("result=" + JSON.stringify(result))
        // alert("saved document: " + JSON.stringify(doc))
    } catch (e) {
        alert("error while saving: " + JSON.stringify(e))
    }
}

function delete_document() {
    var result = db.deleteDoc(current_doc)
    // alert("Deleted!\nresult=" + JSON.stringify(result))
    // update GUI
    canvas.remove_document(current_doc._id, true)
    show_document()
}

//

function create_relation(doc_id) {
    // add to current topic
    if (!current_doc.related_ids) {
        current_doc.related_ids = []
    }
    current_doc.related_ids.push(doc_id)
    save_document(current_doc)
    // add to related topic
    var related_doc = db.open(doc_id)
    if (!related_doc.related_ids) {
        related_doc.related_ids = []
    }
    related_doc.related_ids.push(current_doc._id)
    save_document(related_doc)
    // update GUI
    canvas.add_relation(current_doc._id, doc_id)
    select_document(current_doc._id)
}

function delete_relation() {
    var doc1 = db.open(current_rel.doc1_id)
    var doc2 = db.open(current_rel.doc2_id)
    // assertion
    if (!doc1.related_ids || !doc2.related_ids) {
        alert("delete_relation: missing relation in document")
        return
    }
    //
    var c1 = remove_element(doc1.related_ids, doc2._id)
    var c2 = remove_element(doc2.related_ids, doc1._id)
    // assertion
    if (c1 != c2) {
        alert("delete_relation: " + c1 + " vs. " + c2)
        return
    }
    // update DB
    save_document(doc1)
    save_document(doc2)
    // update GUI
    canvas.remove_relation(current_rel.id, true)
    show_document()
}

//

function call_document_function(function_name) {
    // alert("call_document_function: " + function_name)
    var impl = implementations[current_doc.implementation]
    eval("impl." + function_name + "()")
}

function call_relation_function(function_name) {
    if (function_name == "delete_relation") {
        delete_relation()
    } else {
        alert("call_relation_function: function \"" + function_name + "\" not implemented")
    }
}

/* Helper */

function empty_detail_panel() {
    $("#detail_panel").empty()
    $("#lower_document_controls").empty()
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

// FIXME: currently not used
/* function element_index(array, elem) {
    for (var i = 0, e; e = array[i]; i++) {
        if (e == elem) {
            return i
        }
    }
    return -1
} */

function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function log(text) {
    debug_window.document.writeln(text + "<br>")
}
