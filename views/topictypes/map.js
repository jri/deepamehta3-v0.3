function(doc) {

    // !code lib/helpers/helpers.js

    if (doc.type == "Topic" && doc.topic_type == "Topic Type") {
        emit(get_field("type-id").content, doc.instance_template)
    }
}
