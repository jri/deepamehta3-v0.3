function dm3_datafields() {

    this.render_field_content = function(field) {
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
        }
    }

    this.render_form_field = function(field) {

        switch (field.model.type) {
        case "text":
            return render_text_field(field)
        case "date":
            return render_date_field(field)
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
    }

    this.get_field_content = function(field) {
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
        }
    }
}
