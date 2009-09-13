function PlainDocument() {

    // upload dialog
    $("#attachment_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: 550})
    $("#upload_target").load(upload_complete)
    // delete dialog
    $("#delete_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: 350,
        buttons: {"Delete": do_delete}})

    this.render_document = function(doc) {
        // fields
        for (var i = 0, field; field = doc.fields[i]; i++) {
            $("#detail_panel").append($("<div>").addClass("field_name").text(field.id))         // field name
            $("#detail_panel").append($(render_text(field.content)).addClass("field_value"))    // field value
        }
        // attachments
        if (doc._attachments) {
            $("#detail_panel").append($("<div>").addClass("field_name").text("Attachments"))
            for (var attach in doc._attachments) {
                var a = $("<a>").attr("href", db.uri + doc._id + "/" + attach).text(attach)
                $("#detail_panel").append(a).append("<br>")
            }
        }
        // relations
        if (doc.related_ids) {
            var rels = relations(doc._id)
            $("#detail_panel").append($("<div>").addClass("field_name").text("Relations (" + rels.rows.length + ")"))
            for (var i = 0, row; row = rels.rows[i]; i++) {
                var a = $("<a>").attr({href: "", onclick: "reveal_document('" + row.id + "'); return false"}).text(row.value)
                $("#detail_panel").append(a).append("<br>")
            }
        }
        // buttons
        $("#lower_document_controls").append($("<input>").attr({type: "button", id: "edit_button", value: "Edit"}))
        $("#lower_document_controls").append($("<input>").attr({type: "button", id: "attach_button", value: "Upload Attachment"}))
        $("#lower_document_controls").append($("<input>").attr({type: "button", id: "delete_button", value: "Delete"}))
        $("#edit_button").click(this.edit_document)
        $("#attach_button").click(attach_file)
        $("#delete_button").click(confirm_delete)
    }

    this.edit_document = function() {
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
                valuediv.append($("<textarea>").attr({id: "field_" + field.id, rows: 35, cols: 80}).text(field.content))
                break
            default:
                alert("unexpected field type: \"" + field.type + "\"")
            }
            $("#detail_panel").append(valuediv)
        }
        // buttons
        $("#lower_document_controls").append($("<input>").attr({type: "button", id: "save_button", value: "Save"}))
        $("#lower_document_controls").append($("<input>").attr({type: "button", id: "cancel_button", value: "Cancel"}))
        $("#save_button").click(update_document)
        $("#cancel_button").click(cancel_editing)
    }

    this.context_menu_items = function() {
        return [
            {label: "Hide", function: "hide"},
            {label: "Relate", function: "relate"}
        ]
    }

    /* Context Menu Commands */

    this.hide = function() {
        remove_document(false)
    }

    this.relate = function() {
        canvas.begin_relation(current_doc._id)
    }

    /* ---------------------------------------- Private Methods ---------------------------------------- */

    function update_document() {
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            field.content = $("#field_" + field.id).val()
        }
        save_document(current_doc)
        //
        canvas.update_document(current_doc)
        show_document()
    }

    function cancel_editing() {
        show_document()
    }

    /* Attachments */

    function attach_file() {
        $("#attachment_form").attr("action", db.uri + current_doc._id)
        $("#attachment_form_rev").attr("value", current_doc._rev)
        $("#attachment_dialog").dialog("open")
    }

    function upload_complete() {
        $("#attachment_dialog").dialog("close")
        show_document()
    }

    /* Relations */

    function relations(doc_id) {
        return db.view("technotes/relations", {key: doc_id})
    }

    /* Delete */

    function confirm_delete() {
        $("#delete_dialog").dialog("open")
    }

    function do_delete() {
        $("#delete_dialog").dialog("close")
        remove_document(true)
    }

    /* Helper */

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
}
