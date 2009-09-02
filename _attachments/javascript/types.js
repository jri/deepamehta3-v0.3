var types = {
    "note": {
        "fields": [
            {
                "id": "title",
                "show_label": true,
                "type": "single line",
                "content": ""
            },
            {
                "id": "body",
                "show_label": false,
                "type": "multi line",
                "content": ""
            },
            {
                "id": "tags",
                "show_label": true,
                "type": "single line",
                "content": ""
            }
        ]
    }
}

function create_type_select() {
    var select = document.createElement("select")
    select.id = "type_select"
    for (var type in types) {
        var option = document.createElement("option")
        option.appendChild(document.createTextNode(type))
        select.appendChild(option)
    }
    return select
}
