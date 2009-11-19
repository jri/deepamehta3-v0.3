function PlainDocument() {
    DEFAULT_FIELD_WIDTH = 60    // in chars
    DEFAULT_AREA_HEIGHT = 30    // in chars
    UPLOAD_DIALOG_WIDTH = 800   // in pixel
    DELETE_DIALOG_WIDTH = 350   // in pixel
    // The upload dialog
    $("#attachment_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: UPLOAD_DIALOG_WIDTH})
    $("#upload_target").load(this.upload_complete)
    // The delete dialog
    $("#delete_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: DELETE_DIALOG_WIDTH,
        buttons: {"Delete": this.do_delete}})
    // The autocomplete list
    $("#document_form").append($("<div>").addClass("autocomplete_list"))
    autocomplete_item = -1
}

PlainDocument.prototype = {

    render_document: function(doc) {

        // alert("render_document: this=" + this + " type=" + typeof(this) + "\n" + JSON.stringify(this))
        render_fields()
        render_attachments()
        render_relations()
        // render_buttons()     // doesn't work ("this" reference is different)

        function render_fields() {
            // alert("render_fields: this=" + this + " type=" + typeof(this) + "\n" + JSON.stringify(this))
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
                var topics = PlainDocument.prototype.get_related_topics(doc, field)
                $("#detail_panel").append($("<div>").addClass("field_name").text(field.id + " (" + topics.length + ")"))
                var field_value = $("<div>").addClass("field_value")
                PlainDocument.prototype.render_topic_list(topics, field_value)
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
            PlainDocument.prototype.render_topic_list(topics, field_value)
            $("#detail_panel").append(field_value)
        }

        // functio render_buttons() {
        $("#lower_toolbar").append("<button id='edit_button'>")
        $("#lower_toolbar").append("<button id='attach_button'>")
        $("#lower_toolbar").append("<button id='delete_button'>")
        ui.button("edit_button", edit_document, "Edit", "pencil")
        ui.button("attach_button", this.attach_file, "Upload Attachment", "document")
        ui.button("delete_button", this.confirm_delete, "Delete", "trash")
        // }
    },

    render_document_form: function() {
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
                            var input = $("<input>").attr({id: "field_" + field.id, value: field.content, size: DEFAULT_FIELD_WIDTH})
                            if (field.view.autocomplete_indexes) {
                                input.keyup(this.autocomplete)
                                input.blur(this.lost_focus)
                            }
                            valuediv.append(input)
                            break
                        case "multi line":
                            var lines = field.view.lines || DEFAULT_AREA_HEIGHT
                            valuediv.append($("<textarea>").attr({id: "field_" + field.id, rows: lines, cols: DEFAULT_FIELD_WIDTH}).text(field.content))
                            break
                        default:
                            alert("render_document_form: unexpected field editor (" + field.view.editor + ")")
                    }
                    break
                case "relation":
                    switch (field.view.editor) {
                        case "checkboxes":
                            render_defined_relations(current_doc, field)
                            break
                        default:
                            alert("render_document_form: unexpected field editor (" + field.view.editor + ")")
                    }
                    break
                default:
                    alert("render_document_form: unexpected field type (" + field.model.type + ")")
            }
            $("#detail_panel").append(valuediv)
        }

        function render_defined_relations(doc, field) {
            // buffer current topic selection to compare it at submit time
            var topics = PlainDocument.prototype.get_related_topics(doc, field)
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
    },

    post_render_form: function() {
        // buttons
        $("#lower_toolbar").append("<button id='save_button'>")
        $("#lower_toolbar").append("<button id='cancel_button'>")
        ui.button("save_button", this.update_document, "Save", "circle-check", true)
        ui.button("cancel_button", this.cancel_editing, "Cancel")
    },

    context_menu_items: function() {
        return [
            {label: "Hide", function: "hide"},
            {label: "Relate", function: "relate"}
        ]
    },

    /* Context Menu Commands */

    hide: function() {
        remove_document(false)
    },

    relate: function() {
        canvas.begin_relation(current_doc._id)
    },

    /* Helper */

    /**
     * @param   topics      Array of rows as returned by the CouchDB "topics" view.
     */
    render_topic_list: function(topics, elem) {
        for (var i = 0, row; row = topics[i]; i++) {
            var a = $("<a>").attr({href: "", onclick: "reveal_document('" + row.id + "'); return false"}).text(row.value.name)
            elem.append(a).append("<br>")
        }
        return elem
    },

    /**
     * Returns topics of a "relation" field.
     */
    get_related_topics: function(doc, field) {
        var doc_ids = related_doc_ids(doc._id)
        return get_topics(doc_ids, field.model.related_type)
    },

    /* ---------------------------------------- Private Methods ---------------------------------------- */

    update_document: function() {
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
                            PlainDocument.prototype.update_relation_field(current_doc, field)
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
    },

    update_relation_field: function(doc, field) {
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
    },

    cancel_editing: function() {
        show_document()
    },

    /* Attachments */

    attach_file: function() {
        $("#attachment_form").attr("action", db.uri + current_doc._id)
        $("#attachment_form_rev").attr("value", current_doc._rev)
        $("#attachment_dialog").dialog("open")
    },

    upload_complete: function() {
        $("#attachment_dialog").dialog("close")
        show_document()
    },

    /* Delete */

    confirm_delete: function() {
        $("#delete_dialog").dialog("open")
    },

    do_delete: function() {
        $("#delete_dialog").dialog("close")
        remove_document(true)
    },



    /***********************/
    /*** Auto-Completion ***/
    /***********************/



    /**
     * Auto-Completion main function. Triggered for every keystroke.
     */
    autocomplete: function(event) {
        // log("autocomplete: which=" + event.which)
        if (PlainDocument.prototype.handle_special_input(event)) {
            return
        }
        // assertion
        if (this.id.substr(0, 6) != "field_") {
            alert("autocomplete: document " + current_doc._id + "\n" +
                "has unexpected element id (" + this.id + ").\n" +
                "It is expected to begin with \"field_\"")
            return
        }
        // Holds the matched items (model). These items are rendered as pulldown menu (the "autocomplete list", view).
        // Element type: array, holds all item fields as stored by the fulltext index function.
        autocomplete_items = []
        item_id = 0
        //
        try {
            var field = PlainDocument.prototype.get_field(this)
            var searchterm = searchterm(field, this)
            // --- trigger search for each fulltext index ---
            for (var i = 0, index; index = field.view.autocomplete_indexes[i]; i++) {
                var result = db.fulltext_search(index, searchterm + "*")
                //
                if (result.rows.length && !autocomplete_items.length) {
                    PlainDocument.prototype.show_autocomplete_list(this)
                }
                // --- add each result item to the autocomplete list ---
                for (var j = 0, row; row = result.rows[j]; j++) {
                    // Note: only default field(s) is/are respected.
                    var item = row.fields.default
                    // Note: if the fulltext index function stores only one field per document
                    // we get it as a string, otherwise we get an array.
                    if (typeof(item) == "string") {
                        item = [item]
                    }
                    // --- Add item to model ---
                    autocomplete_items.push(item)
                    // --- Add item to view ---
                    var html = trigger_doctype_hook("render_autocomplete_item", item)
                    var a = $("<a>").attr({href: "", id: item_id++}).html(html)
                    a.mousemove(PlainDocument.prototype.item_hovered)
                    a.mousedown(PlainDocument.prototype.process_selection)
                    // Note: we use "mousedown" instead of "click" because the click causes loosing the focus
                    // and "lost focus" is fired _before_ "mouseup" and thus "click" would never be fired.
                    // At least as long as we hide the autocompletion list on "hide focus" which we do for
                    // the sake of simplicity. This leads to non-conform GUI behavoir (action on mousedown).
                    // A more elaborated rule for hiding the autocompletion list is required.
                    $(".autocomplete_list").append(a)
                }
            }
        } catch (e) {
            // log("Error while searching: " + JSON.stringify(e))
        }
        //
        if (!autocomplete_items.length) {
            PlainDocument.prototype.hide_autocomplete_list("no result")
        }

        function searchterm(field, input_element) {
            if (field.view.autocomplete_style == "item list") {
                var searchterm = PlainDocument.prototype.current_term(input_element)
                // log("pos=" + searchterm[1] + "cpos=" + searchterm[2] + " searchterm=\"" + searchterm[0] + "\"")
                return searchterm[0]
            } else {
                // autocomplete_style "default"
                return input_element.value
            }
        }
    },

    handle_special_input: function(event) {
        // log("handle_special_input: event.which=" + event.which)
        if (event.which == 13) {            // return
            PlainDocument.prototype.process_selection()
            return true
        } if (event.which == 27) {          // escape
            PlainDocument.prototype.hide_autocomplete_list("aborted (escape)")
            return true
        } if (event.which == 38) {          // cursor up
            autocomplete_item--
            if (autocomplete_item == -2) {
                autocomplete_item = autocomplete_items.length -1
            }
            // log("handle_special_input: cursor up, autocomplete_item=" + autocomplete_item)
            PlainDocument.prototype.activate_list_item()
            return true
        } else if (event.which == 40) {     // cursor down
            autocomplete_item++
            if (autocomplete_item == autocomplete_items.length) {
                autocomplete_item = -1
            }
            // log("handle_special_input: cursor down, autocomplete_item=" + autocomplete_item)
            PlainDocument.prototype.activate_list_item()
            return true
        }
    },

    process_selection: function() {
        if (autocomplete_item != -1) {
            var input_element_id = $(".autocomplete_list").attr("id").substr(7) // 7 = "aclist_".length
            var input_element = $("#" + input_element_id).get(0)
            // trigger hook to get the item (string) to insert into the input element
            var item = trigger_doctype_hook("process_autocomplete_selection", autocomplete_items[autocomplete_item])
            //
            var field = PlainDocument.prototype.get_field(input_element)
            if (field.view.autocomplete_style == "item list") {
                var term = PlainDocument.prototype.current_term(input_element)  // term[0]: the term to replace, starts immediately after the comma
                                                                                // term[1]: position of the previous comma or -1
                var value = input_element.value
                input_element.value = value.substring(0, term[1] + 1)
                if (term[1] + 1 > 0) {
                    input_element.value += " "
                }
                input_element.value += item + ", " + value.substring(term[1] + 1 + term[0].length)
            } else {
                // autocomplete_style "default"
                input_element.value = item
            }
        }
        PlainDocument.prototype.hide_autocomplete_list("selection performed")
    },

    current_term: function(input_element) {
        var cpos = input_element.selectionStart
        var pos = input_element.value.lastIndexOf(",", cpos - 1)
        var term = input_element.value.substring(pos + 1, cpos)
        return [term, pos, cpos]
    },

    get_field: function(input_element) {
        var field_id = input_element.id.substr(6)            // 6 = "field_".length
        var field = get_field(current_doc, field_id)
        return field
    },

    lost_focus: function() {
        PlainDocument.prototype.hide_autocomplete_list("lost focus")
    },

    show_autocomplete_list: function(input_element) {
        // log("show_autocomplete_list: " + input_element.id)
        var pos = $(input_element).position()
        var height = $(input_element).outerHeight()
        $(".autocomplete_list").attr("id", "aclist_" + input_element.id)
        $(".autocomplete_list").css({top: pos.top + height, left: pos.left})
        $(".autocomplete_list").empty()
        $(".autocomplete_list").show()
    },

    hide_autocomplete_list: function(msg) {
        // log("hide_autocomplete_list: " + msg)
        $(".autocomplete_list").hide()
        autocomplete_item = -1
    },

    activate_list_item: function() {
        $(".autocomplete_list a").removeClass("active")
        $(".autocomplete_list a:eq(" + autocomplete_item + ")").addClass("active")
    },

    item_hovered: function() {
        autocomplete_item = this.id
        // log("item_hovered: autocomplete_item=" + autocomplete_item)
        PlainDocument.prototype.activate_list_item()
    }
}
