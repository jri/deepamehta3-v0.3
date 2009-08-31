var db = new CouchDB("technotes-db");

db.fulltext_search = function(text) {
    var viewPath = this.uri + "_fti/technotes/search?q=" + text;
    this.last_req = this.request("GET", viewPath);      
    if (this.last_req.status == 404)
        return null;
    CouchDB.maybeThrowError(this.last_req);
    return JSON.parse(this.last_req.responseText);
}

// var result = db.view("technotes/bytag", {key: "Ruby"});
// alert("total_rows=" + result.total_rows + ", result size=" + result.rows.length);

var search_field;
var detail_panel;
var current_doc;        // document being displayed
var canvas;

function init() {
    canvas = new Canvas()
    // alert("canvas.canvas=" + canvas.canvas)
    //
    search_field = document.getElementById("search_field");
    //
    var search_form = document.getElementById("search_form");
    search_form.onsubmit = search;
    var edit_button = document.getElementById("edit_button");
    edit_button.onclick = edit_document;
    var save_button = document.getElementById("save_button");
    save_button.onclick = save_document;
    var cancel_button = document.getElementById("cancel_button");
    cancel_button.onclick = cancel_editing;
    //
    detail_panel = document.getElementById("detail_panel");
    // dummy content
    canvas.add_document("a13c6b38244dc7414579b87929a1aec5", 80, 50);
    canvas.add_document("b15ac875916cf91507b3a3d1ff59d4cb", 200, 150);
    canvas.add_document("5c475253a3598e03c33db7078514b3aa", 350, 80);
    //
    canvas.refresh();
}

function search() {
    var text = search_field.value
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
    clear_detail_panel();
    current_doc = db.open(doc_id);
    for (var field in current_doc) {
        if (field == "_id" || field == "_rev")
            continue;
        // field name
        var namediv = document.createElement("div");
        namediv.setAttribute("class", "field_name");
        namediv.appendChild(document.createTextNode(field));
        // field value
        var valuediv = render_property(field, current_doc[field]);
        valuediv.setAttribute("class", "field_value");
        //
        detail_panel.appendChild(namediv);
        detail_panel.appendChild(valuediv);
    }
}

function edit_document() {
    clear_detail_panel();
    for (var field in current_doc) {
        if (field == "_id" || field == "_rev")
            continue;
        // field name
        var namediv = document.createElement("div");
        namediv.setAttribute("class", "field_name");
        namediv.appendChild(document.createTextNode(field));
        // field value
        var valuediv = document.createElement("div");
        valuediv.setAttribute("class", "field_value");
        var textarea = document.createElement("textarea");
        textarea.setAttribute("id", "field_" + field);
        textarea.setAttribute("rows", "20");
        textarea.setAttribute("cols", "60");
        textarea.appendChild(document.createTextNode(current_doc[field]));
        valuediv.appendChild(textarea);
        //
        detail_panel.appendChild(namediv);
        detail_panel.appendChild(valuediv);
    }
}

function save_document() {
    new_doc = {};
    for (var field in current_doc) {
        if (field == "_id" || field == "_rev") {
            new_doc[field] = current_doc[field];
        } else {
            new_doc[field] = document.getElementById("field_" + field).value;
        }
    }
    // alert("save document " + JSON.stringify(new_doc));
    try {
        result = db.save(new_doc);
        // alert("result=" + JSON.stringify(result));
    } catch (e) {
        alert("while saving: " + JSON.stringify(e))
    }
    //
    show_document(current_doc["_id"])
}

function cancel_editing() {
    show_document(current_doc["_id"])
}

function clear_detail_panel() {
    var child;
    while (child = detail_panel.firstChild) {
        detail_panel.removeChild(child);
    }
}

// Creates a div-element holding the field value.
// Conversion performed on text values: linefeed characters (\n) are replaced by a br-element.
function render_property(name, value) {
    var div = document.createElement("div");
    switch (typeof value) {
    case "string":
        var pos = 0;
        do {
            var i = value.indexOf("\n", pos);
            if (i >= 0) {
                div.appendChild(document.createTextNode(value.substring(pos, i)));
                div.appendChild(document.createElement("br"));
                pos = i + 1;
            }
        } while (i >= 0);
        // alert("value=\"" + value + "\"\nlength=" + value.length + "\ntype=" + typeof value);
        div.appendChild(document.createTextNode(value.substring(pos)));
        break;
    case "number":
        div.appendChild(document.createTextNode(value));
        break;
    case "object":
        if (name == "items") {
            for (var i = 0, item; item = value[i]; i++) {
                var a = document.createElement("a")
                a.href = ""
                a.setAttribute("onclick", "reveal_document('" + item.id + "'); return false") 
                a.appendChild(document.createTextNode(item.id));
                var p = document.createElement("p")
                p.appendChild(a)
                div.appendChild(p)
            }
        } else {
            var table = document.createElement("table")
            for (var name in value) {
                var tr = document.createElement("tr")
                var td1 = document.createElement("td")
                td1.appendChild(document.createTextNode(name))
                var td2 = document.createElement("td")
                td2.appendChild(document.createTextNode(value[name]))
                tr.appendChild(td1)
                tr.appendChild(td2)
                table.appendChild(tr)
            }
            div.appendChild(table)
        }
        break;
    default:
        alert("unexpected type: " + typeof value);
    }
    return div;
}
