var db = new CouchDB("technotes-db")

db.fulltext_search = function(text) {
    var viewPath = this.uri + "_fti/technotes/search?q=" + text
    this.last_req = this.request("GET", viewPath)      
    if (this.last_req.status == 404)
        return null
    CouchDB.maybeThrowError(this.last_req)
    return JSON.parse(this.last_req.responseText)
}

var current_doc        // document being displayed, or null if no one is currently displayed
var canvas
var implementations = {}

function init() {
    canvas = new Canvas()
    // search form
    $("#search_form").submit(search)
    // type select
    $("#type_select_placeholder").replaceWith(create_type_select())
    // create button
    $("#create_button").click(create_document)
    //
    for (var i = 0, implementation_class; implementation_class = implementation_classes[i]; i++) {
        implementations[implementation_class] = eval("new " + implementation_class)
    }
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
    // fetch
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
    related_doc = db.open(doc_id)
    if (!related_doc.related_ids) {
        related_doc.related_ids = []
    }
    related_doc.related_ids.push(current_doc._id)
    save_document(related_doc)
    // update GUI
    select_document(current_doc._id)
}

//

function handle_context_command(function_name) {
    // alert("handle_context_command: function_name=" + function_name)
    var impl = implementations[current_doc.implementation]
    eval("impl." + function_name + "()")
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

function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}
