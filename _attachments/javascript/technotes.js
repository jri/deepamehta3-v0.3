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
var type_select;
var detail_panel;
var current_doc;        // document being displayed
var canvas;

function init() {
    canvas = new Canvas()
    //
    search_field = document.getElementById("search_field");
    //
    var search_form = document.getElementById("search_form");
    search_form.onsubmit = search;
    // type menu
    var tmp = document.getElementById("type_select_placeholder")
    tmp.parentNode.replaceChild(create_type_select(), tmp)
    type_select = document.getElementById("type_select")
    //
    var create_button = document.getElementById("create_button");
    var edit_button   = document.getElementById("edit_button");
    var save_button   = document.getElementById("save_button");
    var cancel_button = document.getElementById("cancel_button");
    create_button.onclick = create_document;
    edit_button.onclick   = edit_document;
    save_button.onclick   = update_document;
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
    // single document
    if (current_doc.fields) {
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            // field name
            var namediv = document.createElement("div");
            namediv.setAttribute("class", "field_name");
            namediv.appendChild(document.createTextNode(field.id));
            // field value
            var valuediv = render_text(field.content);
            valuediv.setAttribute("class", "field_value");
            //
            detail_panel.appendChild(namediv);
            detail_panel.appendChild(valuediv);
        }
    // search result
    } else if (current_doc.items) {
        for (var i = 0, item; item = current_doc.items[i]; i++) {
            var a = document.createElement("a")
            a.href = ""
            a.setAttribute("onclick", "reveal_document('" + item.id + "'); return false") 
            a.appendChild(document.createTextNode(item.id));
            var p = document.createElement("p")
            p.appendChild(a)
            detail_panel.appendChild(p)
        }
    // fallback
    } else {
        detail_panel.appendChild(render_object(current_doc))
    }
}

function create_document() {
    current_doc = clone(types[type_select.value])
    save_document(current_doc)
    //
    canvas.add_document(current_doc._id)
    canvas.refresh()
    // alert("saved document: " + JSON.stringify(current_doc));
    edit_document()
}

function edit_document() {
    clear_detail_panel();
    for (var i = 0, field; field = current_doc.fields[i]; i++) {
        // field name
        var namediv = document.createElement("div");
        namediv.setAttribute("class", "field_name");
        namediv.appendChild(document.createTextNode(field.id));
        // field value
        var valuediv = document.createElement("div");
        valuediv.setAttribute("class", "field_value");
        switch (field.type) {
        case "single line":
            var input = document.createElement("input");
            input.id = "field_" + field.id
            input.value = field.content     // doesn't show up in DOM inspector but works
            input.size = 80
            valuediv.appendChild(input)
            break
        case "multi line":
            var textarea = document.createElement("textarea")
            textarea.id = "field_" + field.id
            textarea.rows = 40
            textarea.cols = 80
            textarea.appendChild(document.createTextNode(field.content))
            valuediv.appendChild(textarea)
            break
        default:
            alert("unexpected field type: \"" + field.type + "\"")
        }
        //
        detail_panel.appendChild(namediv);
        detail_panel.appendChild(valuediv);
    }
}

function update_document() {
    for (var i = 0, field; field = current_doc.fields[i]; i++) {
        field.content = document.getElementById("field_" + field.id).value;
    }
    save_document(current_doc)
    show_document(current_doc._id)
}

function save_document(doc) {
    // alert("save document: " + JSON.stringify(current_doc));
    try {
        result = db.save(current_doc);
        // alert("result=" + JSON.stringify(result));
    } catch (e) {
        alert("error while saving: " + JSON.stringify(e))
    }
}

function cancel_editing() {
    show_document(current_doc._id)
}

function clear_detail_panel() {
    var child;
    while (child = detail_panel.firstChild) {
        detail_panel.removeChild(child);
    }
}

// Creates a div-element holding the text.
// Conversion performed: linefeed characters (\n) are replaced by br-elements.
function render_text(text) {
    var div = document.createElement("div");
    var pos = 0;
    do {
        var i = text.indexOf("\n", pos);
        if (i >= 0) {
            div.appendChild(document.createTextNode(text.substring(pos, i)));
            div.appendChild(document.createElement("br"));
            pos = i + 1;
        }
    } while (i >= 0);
    // alert("text=\"" + text + "\"\nlength=" + text.length + "\ntype=" + typeof text);
    div.appendChild(document.createTextNode(text.substring(pos)));
    return div;
}

function render_object(object) {
    var table = document.createElement("table")
    for (var name in object) {
        var tr = document.createElement("tr")
        var td1 = document.createElement("td")
        td1.appendChild(document.createTextNode(name))
        var td2 = document.createElement("td")
        td2.appendChild(document.createTextNode(object[name]))
        tr.appendChild(td1)
        tr.appendChild(td2)
        table.appendChild(tr)
    }
    return table;
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}
