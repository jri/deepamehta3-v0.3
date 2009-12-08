function PlainDocument() {

    // Settings
    DEFAULT_FIELD_WIDTH = 60    // in chars
    DEFAULT_AREA_HEIGHT = 30    // in chars
    UPLOAD_DIALOG_WIDTH = "50em"
    DELETE_DIALOG_WIDTH = 350   // in pixel

    // The upload dialog
    $("#attachment_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: UPLOAD_DIALOG_WIDTH})
    $("#upload-target").load(this.upload_complete)
    // The delete dialog
    $("#delete_dialog").dialog({modal: true, autoOpen: false, draggable: false, resizable: false, width: DELETE_DIALOG_WIDTH,
        buttons: {"Delete": this.do_delete}})
    // The autocomplete list
    $("#document-form").append($("<div>").addClass("autocomplete-list"))
    autocomplete_item = -1
}

PlainDocument.prototype = {

    render_document: function(doc) {

        var defined_relation_topics = []

        render_fields()
        render_attachments()
        render_relations()
        render_buttons()

        function render_fields() {
            for (var i = 0, field; field = doc.fields[i]; i++) {
                if (field.model.type != "relation") {
                    // field name
                    PlainDocument.prototype.render_field_name(field)
                    // field value
                    var html = trigger_hook("render_field", field)[0]
                    if (html != undefined) {
                        $("#detail-panel").append($("<div>").addClass("field-value").html(html))
                    } else {
                        alert("render_fields: field \"" + field.id + "\" has unexpected type (\"" + field.model.type + "\")")
                    }
                } else {
                    render_defined_relations(field)
                }
            }

            function render_defined_relations(field) {
                switch (field.view.editor) {
                case "checkboxes":
                    var topics = PlainDocument.prototype.get_related_topics(doc._id, field)
                    defined_relation_topics = defined_relation_topics.concat(topics)
                    // field name
                    PlainDocument.prototype.render_field_name(field, " (" + topics.length + ")")
                    // field value
                    $("#detail-panel").append($("<div>").addClass("field-value").append(render_topics(topics)))
                    break
                default:
                    alert("render_fields: field \"" + field.id + "\" has unexpected editor (\"" + field.view.editor + "\")")
                }
            }
        }

        function render_attachments() {
            if (doc._attachments) {
                PlainDocument.prototype.render_field_name("Attachments")
                var field_value = $("<div>").addClass("field-value")
                for (var attach in doc._attachments) {
                    var a = $("<a>").attr("href", db.uri + doc._id + "/" + attach).text(attach)
                    field_value.append(a).append("<br>")
                }
                $("#detail-panel").append(field_value)
            }
        }

        function render_relations() {
            var topics = get_topics(related_doc_ids(doc._id))
            // don't render topics already rendered via "defined relations"
            substract(topics, defined_relation_topics, function(topic, drt) {
                return topic.id == drt.id
            })
            //
            PlainDocument.prototype.render_field_name("Relations (" + topics.length + ")")
            var field_value = $("<div>").addClass("field-value")
            field_value.append(render_topics(topics))
            $("#detail-panel").append(field_value)
        }

        function render_buttons() {
            $("#lower_toolbar").append("<button id='edit_button'>")
            $("#lower_toolbar").append("<button id='attach_button'>")
            $("#lower_toolbar").append("<button id='delete_button'>")
            ui.button("edit_button", edit_document, "Edit", "pencil")
            ui.button("attach_button", PlainDocument.prototype.attach_file, "Upload Attachment", "document")
            ui.button("delete_button", PlainDocument.prototype.confirm_delete, "Delete", "trash")
        }
    },

    render_document_form: function() {
        empty_detail_panel()
        topic_buffer = {}
        //
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            // field name
            this.render_field_name(field)
            // field value
            if (field.model.type != "relation") {
                var html = trigger_hook("render_form_field", field)[0]
                if (html != undefined) {
                    $("#detail-panel").append($("<div>").addClass("field-value").append(html))
                } else {
                    alert("render_document_form: field \"" + field.id + "\" has unexpected type (\"" + field.model.type + "\")")
                }
            } else {
                render_defined_relations(current_doc, field)
            }
        }

        function render_defined_relations(doc, field) {
            var value_div = $("<div>").addClass("field-value")
            //
            switch (field.view.editor) {
            case "checkboxes":
                // buffer current topic selection to compare it at submit time
                var topics = PlainDocument.prototype.get_related_topics(doc._id, field)
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
                    value_div.append($("<label>").append($("<input>").attr(attr)).append(row.value))
                }
                break
            default:
                alert("render_defined_relations: field \"" + field.id + "\" has unexpected editor (\"" + field.view.editor + "\")")
            }
            //
            $("#detail-panel").append(value_div)
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
     * @param   field   a field object or a string.
     */
    render_field_name: function(field, suffix) {
        var name
        if (typeof(field) == "string") {
            name = field
        } else {
            // Note: the "view" element is optional, e.g. for a "date" field
            name = field.view && field.view.label ? field.view.label : field.id
            if (suffix) {
                name += suffix
            }
        }
        $("#detail-panel").append($("<div>").addClass("field-name").text(name))
    },

    /**
     * Returns topics of a "relation" field.
     */
    get_related_topics: function(doc_id, field) {
        var doc_ids = related_doc_ids(doc_id)
        return get_topics(doc_ids, field.model.related_type)
    },

    /* ---------------------------------------- Private Methods ---------------------------------------- */

    update_document: function() {
        for (var i = 0, field; field = current_doc.fields[i]; i++) {
            if (field.model.type != "relation") {
                var content = trigger_hook("get_field_content", field)[0]
                if (content != undefined) {
                    field.content = content
                } else {
                    alert("update_document: field \"" + field.id + "\" has unexpected type (\"" + field.model.type + "\")")
                }
            } else {
                PlainDocument.prototype.update_relation_field(current_doc, field)
            }
        }
        // update DB
        save_document(current_doc)
        // update GUI
        canvas.update_document(current_doc)
        canvas.refresh()
        show_document()
    },

    update_relation_field: function(doc, field) {
        switch (field.view.editor) {
        case "checkboxes":
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
            break
        default:
            alert("update_relation_field: field \"" + field.id + "\" has unexpected editor (\"" + field.view.editor + "\")")
        }
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
        var item_id = 0
        //
        try {
            var field = PlainDocument.prototype.get_field(this)
            var searchterm = searchterm(field, this)
            if (searchterm) {
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
                        var ac_item = trigger_doctype_hook("render_autocomplete_item", item)
                        var a = $("<a>").attr({href: "", id: item_id++}).append(ac_item)
                        a.mousemove(PlainDocument.prototype.item_hovered)
                        a.mousedown(PlainDocument.prototype.process_selection)
                        // Note: we use "mousedown" instead of "click" because the click causes loosing the focus
                        // and "lost focus" is fired _before_ "mouseup" and thus "click" would never be fired.
                        // At least as long as we hide the autocompletion list on "hide focus" which we do for
                        // the sake of simplicity. This leads to non-conform GUI behavoir (action on mousedown).
                        // A more elaborated rule for hiding the autocompletion list is required.
                        $(".autocomplete-list").append(a)
                    }
                }
            }
        } catch (e) {
            alert("Error while searching: " + JSON.stringify(e))
        }
        //
        if (!autocomplete_items.length) {
            PlainDocument.prototype.hide_autocomplete_list("no result")
        }

        function searchterm(field, input_element) {
            if (field.view.autocomplete_style == "item list") {
                var searchterm = PlainDocument.prototype.current_term(input_element)
                // log("pos=" + searchterm[1] + "cpos=" + searchterm[2] + " searchterm=\"" + searchterm[0] + "\"")
                return $.trim(searchterm[0])
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
            var input_element = PlainDocument.prototype.get_input_element()
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
                PlainDocument.prototype.update_viewport(input_element)
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

    get_input_element: function() {
        var input_element_id = $(".autocomplete-list").attr("id").substr(7) // 7 = "aclist_".length
        var input_element = $("#" + input_element_id).get(0)
        return input_element
    },

    get_field: function(input_element) {
        var field_id = input_element.id.substr(6)            // 6 = "field_".length
        var field = get_field(current_doc, field_id)
        return field
    },

    /**
     * Moves the viewport of the input element in a way the current cursor position is on-screen.
     * This is done by triggering the space key followed by a backspace.
     */
    update_viewport: function(input_element) {
        // space
        var e = document.createEvent("KeyboardEvent");
        e.initKeyEvent("keypress", true, true, null, false, false, false, false, 0, 32);
        input_element.dispatchEvent(e);
        // backspace
        e = document.createEvent("KeyboardEvent");
        e.initKeyEvent("keypress", true, true, null, false, false, false, false, 8, 0);
        input_element.dispatchEvent(e);
    },

    lost_focus: function() {
        PlainDocument.prototype.hide_autocomplete_list("lost focus")
    },

    show_autocomplete_list: function(input_element) {
        var pos = $(input_element).position()
        // calculate position
        var top = pos.top + $(input_element).outerHeight()
        var left = pos.left
        // limit size (avoids document growth and thus window scrollbars)
        var max_width = window.innerWidth - left - 26   // leave buffer for vertical document scrollbar
        var max_height = window.innerHeight - top - 2
        //
        $(".autocomplete-list").attr("id", "aclist_" + input_element.id)
        $(".autocomplete-list").css({top: top, left: left})
        $(".autocomplete-list").css({"max-width": max_width, "max-height": max_height, overflow: "hidden"})
        $(".autocomplete-list").empty()
        $(".autocomplete-list").show()
    },

    hide_autocomplete_list: function(msg) {
        $(".autocomplete-list").hide()
        autocomplete_item = -1
    },

    activate_list_item: function() {
        $(".autocomplete-list a").removeClass("active")
        $(".autocomplete-list a:eq(" + autocomplete_item + ")").addClass("active")
    },

    item_hovered: function() {
        autocomplete_item = this.id
        PlainDocument.prototype.activate_list_item()
    }
}
