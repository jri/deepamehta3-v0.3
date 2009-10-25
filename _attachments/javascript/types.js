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
