var db = new CouchDB("technotes-db")

db.fulltext_search = function(text) {
    var viewPath = this.uri + "_fti/technotes/search?q=" + text
    this.last_req = this.request("GET", viewPath)      
    if (this.last_req.status == 404)
        return null
    CouchDB.maybeThrowError(this.last_req)
    return JSON.parse(this.last_req.responseText)
}

// var result = db.view("technotes/bytag", {key: "Ruby"})
// alert("total_rows=" + result.total_rows + ", result size=" + result.rows.length)

var current_doc        // document being displayed
var canvas

function init() {
    canvas = new Canvas()
    // search form
    $("#search_form").submit(search)
    // type select
    $("#type_select_placeholder").replaceWith(create_type_select())
    // buttons
    $("#create_button").click(create_document)
    $("#edit_button").click(edit_document)
    $("#save_button").click(update_document)
    $("#cancel_button").click(cancel_editing)
    $("#attach_button").click(attach_file)
    // upload form
    $("#attachment_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: 350})
    $("#upload_target").load(upload_complete)
    //
    canvas.refresh()
}

function search() {
    try {
        var text = $("#search_field").val()
        result = db.fulltext_search(text)
        // alert("search=" + text + "\nresult=" + JSON.stringify(result))
        //
        // transform search result into result topic
        topic = {"items": []}
        for (var i = 0, row; row = result.rows[i]; i++) {
            topic.items.push({"id": row.id})
        }
        //
        db.save(topic)
        // alert("ID of result topic=" + topic._id)
        //
        canvas.add_document(topic._id)
        show_document(topic._id)
        canvas.refresh()
    } catch (e) {
        alert("error while searching: " + JSON.stringify(e))
    }
    return false
}

function reveal_document(doc_id) {
    if (!canvas.contains(doc_id)) {
        canvas.add_document(doc_id)
    }
    show_document(doc_id)
    canvas.refresh()
}

// Fetches the document and displays it on the content panel.
function show_document(doc_id) {
    if (doc_id == undefined) {
        doc_id = current_doc._id
    }
    empty_detail_panel()
    current_doc = db.open(doc_id)
    // single document
    if (current_doc.fields) {
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            // field name
            $("#detail_panel").append($("<div>").addClass("field_name").text(field.id))
            // field value
            $("#detail_panel").append($(render_text(field.content)).addClass("field_value"))
        }
    // search result
    } else if (current_doc.items) {
        for (var i = 0, item; item = current_doc.items[i]; i++) {
            var a = $("<a>").attr({href: "", onclick: "reveal_document('" + item.id + "'); return false"}).text(item.id)
            $("#detail_panel").append($("<p>").append(a))
        }
    // fallback
    } else {
        $("#detail_panel").append(render_object(current_doc))
    }
    // attachments
    if (current_doc._attachments) {
        $("#detail_panel").append("<div class=\"field_name\">Attachments</div>")
        for (var attach in current_doc._attachments) {
            var a = $("<a>").attr("href", db.uri + current_doc._id + "/" + attach).text(attach)
            $("#detail_panel").append(a).append("<br>")
        }
    }
}

function create_document() {
    current_doc = clone(types[$("#type_select").val()])
    save_document(current_doc)
    //
    canvas.add_document(current_doc._id)
    canvas.refresh()
    // alert("saved document: " + JSON.stringify(current_doc))
    edit_document()
}

function edit_document() {
    empty_detail_panel()
    for (var i = 0, field; field = current_doc.fields[i]; i++) {
        // field name
        $("#detail_panel").append($("<div>").addClass("field_name").text(field.id))
        // field value
        var valuediv = $("<div>").addClass("field_value")
        switch (field.type) {
        case "single line":
            valuediv.append($("<input>").attr({id: "field_" + field.id, value: field.content, size: 80}))
            break
        case "multi line":
            valuediv.append($("<textarea>").attr({id: "field_" + field.id, rows: 40, cols: 80}).text(field.content))
            break
        default:
            alert("unexpected field type: \"" + field.type + "\"")
        }
        $("#detail_panel").append(valuediv)
    }
}

function update_document() {
    for (var i = 0, field; field = current_doc.fields[i]; i++) {
        field.content = $("#field_" + field.id).val()
    }
    save_document(current_doc)
    show_document()
}

function save_document(doc) {
    // alert("save document: " + JSON.stringify(current_doc))
    try {
        result = db.save(current_doc)
        // alert("result=" + JSON.stringify(result))
    } catch (e) {
        alert("error while saving: " + JSON.stringify(e))
    }
}

function cancel_editing() {
    show_document()
}

function attach_file() {
    $("#attachment_form").attr("action", db.uri + current_doc._id)
    $("#attachment_form_rev").attr("value", current_doc._rev)
    $("#attachment_dialog").dialog("open")
}

function upload_complete() {
    $("#attachment_dialog").dialog("close")
    show_document()
}

function empty_detail_panel() {
    $("#detail_panel").empty()
}

// Creates a div-element holding the text.
// Conversion performed: linefeed characters (\n) are replaced by br-elements.
function render_text(text) {
    var div = $("<div>")
    var pos = 0
    do {
        var i = text.indexOf("\n", pos)
        if (i >= 0) {
            div.append(text.substring(pos, i)).append("<br>")
            pos = i + 1
        }
    } while (i >= 0)
    div.append(text.substring(pos))
    return div
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
