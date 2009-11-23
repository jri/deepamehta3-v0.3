function(doc) {

    if (doc.type != "Topic" || doc.topic_type == "Search Result") {
        return
    }

    var ret = new Document();

    if (doc.fields) {
        ret.add(topic_label(),  {field: "topic_label", store: "yes", index: "not_analyzed"})
        ret.add(doc.topic_type, {field: "topic_type",  store: "yes", index: "not_analyzed"})
    }

    function idx(obj) {
        for (var key in obj) {
            switch (typeof obj[key]) {
            case 'object':
                idx(obj[key]);
                break;
            case 'function':
                break;
            default:
                ret.add(obj[key]);
                break;
            }
        }
    };

    idx(doc);

    if (doc._attachments) {
        for (var i in doc._attachments) {
            ret.attachment("default", i);
        }
    }
    
    return ret;



    /***************/
    /*** Helpers ***/
    /***************/



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
}
