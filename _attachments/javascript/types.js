var types = {
    "Note": {
        fields: [
            {
                id: "Title",
                model: {
                    type: "text",
                },
                view: {
                    editor: "single line"
                },
                content: ""
            },
            {
                id: "Body",
                model: {
                    type: "text",
                },
                view: {
                    editor: "multi line"
                },
                content: ""
            }
        ],
        implementation: "PlainDocument"
    }
}

function create_type_select() {
    var select = $("<select>").attr("id", "type_select")
    for (var type in types) {
        select.append($("<option>").text(type))
    }
    return select
}
