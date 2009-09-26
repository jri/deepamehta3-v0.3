function PlainDocument() {

    // upload dialog
    $("#attachment_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: 550})
    $("#upload_target").load(upload_complete)
    // delete dialog
    $("#delete_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: 350,
        buttons: {"Delete": do_delete}})

    this.render_document = function(doc) {

        render_fields()
        render_attachments()
        render_relations()
        // render_buttons()     // doesn't work ("this" reference is different)

        function render_fields() {
            for (var i = 0, field; field = doc.fields[i]; i++) {
                switch (field.model.type) {
                    case "text":
                        $("#detail_panel").append($("<div>").addClass("field_name").text(field.id))
                        switch (field.view.editor) {
                            case "single line":
                            case "multi line":
                                render_text(field.content)
                                break
                            default:
                                alert("render_fields: unexpected field editor (" + field.view.editor + ")")
                        }
                        break
                    case "relation":
                        switch (field.view.editor) {
                            case "checkboxes":
                                render_defined_relations(field)
                                break
                            default:
                                alert("render_fields: unexpected field editor (" + field.view.editor + ")")
                        }
                        break
                    default:
                        alert("render_fields: unexpected field type (" + field.model.type + ")")
                }
            }

            // Creates a div-element holding the text.
            // Conversion performed: linefeed characters (\n) are replaced by br-elements.
            function render_text(text) {
                var field_value = $("<div>").addClass("field_value")
                var pos = 0
                do {
                    var i = text.indexOf("\n", pos)
                    if (i >= 0) {
                        field_value.append(text.substring(pos, i)).append("<br>")
                        pos = i + 1
                    }
                } while (i >= 0)
                field_value.append(text.substring(pos))
                $("#detail_panel").append(field_value)
            }

            function render_defined_relations(field) {
                var topics = get_related_topics(doc, field)
                $("#detail_panel").append($("<div>").addClass("field_name").text(field.id + " (" + topics.length + ")"))
                var field_value = $("<div>").addClass("field_value")
                render_topic_list(topics, field_value)
                $("#detail_panel").append(field_value)
            }
        }

        function render_attachments() {
            if (doc._attachments) {
                $("#detail_panel").append($("<div>").addClass("field_name").text("Attachments"))
                var field_value = $("<div>").addClass("field_value")
                for (var attach in doc._attachments) {
                    var a = $("<a>").attr("href", db.uri + doc._id + "/" + attach).text(attach)
                    field_value.append(a).append("<br>")
                }
                $("#detail_panel").append(field_value)
            }
        }

        function render_relations() {
            var topics = get_topics(related_doc_ids(doc._id))
            $("#detail_panel").append($("<div>").addClass("field_name").text("Relations (" + topics.length + ")"))
            var field_value = $("<div>").addClass("field_value")
            render_topic_list(topics, field_value)
            $("#detail_panel").append(field_value)
        }

        // functio render_buttons() {
        $("#lower_toolbar").append($("<input>").attr({type: "button", id: "edit_button", value: "Edit"}))
        $("#lower_toolbar").append($("<input>").attr({type: "button", id: "attach_button", value: "Upload Attachment"}))
        $("#lower_toolbar").append($("<input>").attr({type: "button", id: "delete_button", value: "Delete"}))
        $("#edit_button").click(this.edit_document)
        $("#attach_button").click(attach_file)
        $("#delete_button").click(confirm_delete)
        // }
    }

    this.edit_document = function() {
        empty_detail_panel()
        topic_buffer = {}
        //
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            // field name
            $("#detail_panel").append($("<div>").addClass("field_name").text(field.id))
            // field value
            var valuediv = $("<div>").addClass("field_value")
            switch (field.model.type) {
                case "text":
                    switch (field.view.editor) {
                        case "single line":
                            valuediv.append($("<input>").attr({id: "field_" + field.id, value: field.content, size: 80}))
                            break
                        case "multi line":
                            var lines = field.view.lines || 30
                            valuediv.append($("<textarea>").attr({id: "field_" + field.id, rows: lines, cols: 80}).text(field.content))
                            break
                        default:
                            alert("edit_document: unexpected field editor (" + field.view.editor + ")")
                    }
                    break
                case "relation":
                    switch (field.view.editor) {
                        case "checkboxes":
                            render_defined_relations(current_doc, field)
                            break
                        default:
                            alert("edit_document: unexpected field editor (" + field.view.editor + ")")
                    }
                    break
                default:
                    alert("edit_document: unexpected field type (" + field.model.type + ")")
            }
            $("#detail_panel").append(valuediv)
        }
        // buttons
        $("#lower_toolbar").append($("<input>").attr({type: "button", id: "save_button", value: "Save"}))
        $("#lower_toolbar").append($("<input>").attr({type: "button", id: "cancel_button", value: "Cancel"}))
        $("#save_button").click(update_document)
        $("#cancel_button").click(cancel_editing)

        function render_defined_relations(doc, field) {
            // buffer current topic selection to compare it at submit time
            var topics = get_related_topics(doc, field)
            topic_buffer[field.id] = topics
            //
            var docs = db.view("deepamehta3/by_type", {key: field.model.related_type})
            for (var i = 0, row; row = docs.rows[i]; i++) {
                var attr = {type: "checkbox", id: row.id, name: "relation_" + field.id}
                if (includes(topics, function(topic) {
                        return topic.id == row.id
                    })) {
                    attr.checked = "checked"
                }
                valuediv.append($("<label>").append($("<input>").attr(attr)).append(row.value))
            }
        }
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

    /* Helper */

    /**
     * @param   topics      Array of rows as returned by the CouchDB "topics" view.
     */
    function render_topic_list(topics, elem) {
        for (var i = 0, row; row = topics[i]; i++) {
            var a = $("<a>").attr({href: "", onclick: "reveal_document('" + row.id + "'); return false"}).text(row.value.name)
            elem.append(a).append("<br>")
        }
        return elem
    }

    /**
     * Returns topics of a "relation" field.
     */
    function get_related_topics(doc, field) {
        var doc_ids = related_doc_ids(doc._id)
        return get_topics(doc_ids, field.model.related_type)
    }

    /* ---------------------------------------- Private Methods ---------------------------------------- */

    function update_document() {
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            switch (field.model.type) {
                case "text":
                    switch (field.view.editor) {
                        case "single line":
                        case "multi line":
                            field.content = $("#field_" + field.id).val()
                            break
                        default:
                            alert("update_document: unexpected field editor (" + field.view.editor + ")")
                    }
                    break
                case "relation":
                    switch (field.view.editor) {
                        case "checkboxes":
                            update_relation_field(current_doc, field)
                            break
                        default:
                            alert("update_document: unexpected field editor (" + field.view.editor + ")")
                    }
                    break
                default:
                    alert("update_document: unexpected field type (" + field.model.type + ")")
            }
        }
        // update DB
        save_document(current_doc)
        // update GUI
        canvas.update_document(current_doc)
        show_document()
    }

    function update_relation_field(doc, field) {
        $("input:checkbox[name=relation_" + field.id + "]").each(
            function() {
                var checkbox = this
                var was_checked_before = includes(topic_buffer[field.id],
                    function(topic) {
                        return topic.id == checkbox.id
                    }
                )
                if (checkbox.checked) {
                    if (!was_checked_before) {
                        create_relation(doc._id, checkbox.id)
                    }
                } else {
                    if (was_checked_before) {
                        delete_relation(get_relation_doc(doc._id, checkbox.id))
                    }
                }
            }
        )
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

    /* Delete */

    function confirm_delete() {
        $("#delete_dialog").dialog("open")
    }

    function do_delete() {
        $("#delete_dialog").dialog("close")
        remove_document(true)
    }
}
