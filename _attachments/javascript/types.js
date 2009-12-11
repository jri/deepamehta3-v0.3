var types = {
    "Note": {
        fields: [
            {id: "Title", model: {type: "text"}, view: {editor: "single line"}, content: ""},
            {id: "Body",  model: {type: "html"}, view: {editor: "multi line"},  content: ""}
        ],
        view: {
            icon_src: "images/pencil.png"
        },
        implementation: "PlainDocument"
    }
}
