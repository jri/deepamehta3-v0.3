var types = {
    "Note": {
        "fields": [
            {
                "id": "Title",
                "show_label": true,
                "type": "single line",
                "content": ""
            },
            {
                "id": "Body",
                "show_label": false,
                "type": "multi line",
                "content": ""
            },
            {
                "id": "Tags",
                "show_label": true,
                "type": "single line",
                "content": ""
            }
        ],
        "implementation": "PlainDocument"
    }
}

function create_type_select() {
    var select = $("<select>").attr("id", "type_select")
    for (var type in types) {
        select.append($("<option>").text(type))
    }
    return select
}
