function dm3_datafields() {

    this.render_field_content = function(field, doc) {
        switch (field.model.type) {
        case "text":
            switch (field.view.editor) {
            case "single line":
            case "multi line":
                return render_text(field.content)
            default:
                alert("render_field_content: unexpected field editor (" + field.view.editor + ")")
            }
            break
        case "date":
            return format_date(field.content)
        case "relation":
            return render_relation_content(field, doc)
        }

        function render_relation_content(field, doc) {
            switch (field.view.editor) {
            case "checkboxes":
                var topics = PlainDocument.prototype.get_related_topics(doc._id, field)
                PlainDocument.prototype.defined_relation_topics = PlainDocument.prototype.defined_relation_topics.concat(topics)
                return render_topics(topics)
            }
        }
    }

    this.render_form_field = function(field, doc) {

        switch (field.model.type) {
        case "text":
            return render_text_field(field)
        case "date":
            return render_date_field(field)
        case "relation":
            return render_relation_field(field, doc)
        }

        function render_text_field(field) {
            switch (field.view.editor) {
            case "single line":
                var input = $("<input>").attr({type: "text", id: "field_" + field.id, value: field.content, size: DEFAULT_FIELD_WIDTH})
                if (field.view.autocomplete_indexes) {
                    input.keyup(PlainDocument.prototype.autocomplete)
                    input.blur(PlainDocument.prototype.lost_focus)
                    input.attr({autocomplete: "off"})
                }
                return input
            case "multi line":
                var lines = field.view.lines || DEFAULT_AREA_HEIGHT
                return $("<textarea>").attr({id: "field_" + field.id, rows: lines, cols: DEFAULT_FIELD_WIDTH}).text(field.content)
            default:
                alert("render_text_field: unexpected field editor (" + field.view.editor + ")")
            }
        }

        function render_date_field(field) {
            var input = $("<input>").attr({type: "hidden", id: "field_" + field.id, value: field.content})
            input.change(function() {
                $("span", $(this).parent()).text(format_date(this.value))
            })
            var date_div = $("<div>")
            date_div.append($("<span>").css("margin-right", "1em").text(format_date(field.content)))
            date_div.append(input)
            input.datepicker({firstDay: 1, showAnim: "fadeIn", showOtherMonths: true, showOn: "button",
                buttonImage: "images/calendar.gif", buttonImageOnly: true, buttonText: "Choose Date"})
            return date_div
        }

        function render_relation_field(field, doc) {
            switch (field.view.editor) {
            case "checkboxes":
                // buffer current topic selection to compare it at submit time
                var topics = PlainDocument.prototype.get_related_topics(doc._id, field)
                PlainDocument.prototype.topic_buffer[field.id] = topics
                //
                var docs = get_topics_by_type(field.model.related_type)
                var relation_div = $("<div>")
                for (var i = 0, row; row = docs.rows[i]; i++) {
                    var attr = {type: "checkbox", id: row.id, name: "relation_" + field.id}
                    if (includes(topics, function(topic) {
                            return topic.id == row.id
                        })) {
                        attr.checked = "checked"
                    }
                    relation_div.append($("<label>").append($("<input>").attr(attr)).append(row.value))
                }
                return relation_div
            }
        }
    }

    this.get_field_content = function(field, doc) {
        switch (field.model.type) {
        case "text":
            switch (field.view.editor) {
            case "single line":
            case "multi line":
                return $.trim($("#field_" + field.id).val())
            default:
                alert("get_field_content: unexpected field editor (" + field.view.editor + ")")
            }
            break
        case "date":
            return $("#field_" + field.id).val()
        case "relation":
            return update_relation_field(field, doc)
        }

        function update_relation_field(field, doc) {
            switch (field.view.editor) {
            case "checkboxes":
                $("input:checkbox[name=relation_" + field.id + "]").each(
                    function() {
                        var checkbox = this
                        var was_checked_before = includes(PlainDocument.prototype.topic_buffer[field.id],
                            function(topic) {
                                return topic.id == checkbox.id
                            }
                        )
                        if (checkbox.checked) {
                            if (!was_checked_before) {
                                create_relation("Relation", doc._id, checkbox.id)
                            }
                        } else {
                            if (was_checked_before) {
                                delete_relation(get_relation_doc(doc._id, checkbox.id)._id)
                            }
                        }
                    }
                )
                // prevent this field from being updated by the caller
                return null
            }
        }
    }
}
