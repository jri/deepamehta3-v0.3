function(doc) {

    if (doc.type != "Topic" || doc.topic_type == "Search Result") {
        return
    }

    var ret = new Document();

    if (doc.fields) {
        ret.add(doc.fields[0].content, {field: "title", store: "yes", index: "not_analyzed"})
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
}
