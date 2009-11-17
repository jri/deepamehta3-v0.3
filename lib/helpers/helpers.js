/*** Helpers ***/

function get_field(field_id) {
    for (var i = 0, field; field = doc.fields[i]; i++) {
        if (field.id == field_id) {
            return field
        }
    }
}

function topic_label() {
    if (doc.view) {
        var field_id = doc.view.label_field
        if (field_id) {
            return get_field(field_id).content
        }
    }
    return doc.fields[0].content
}
