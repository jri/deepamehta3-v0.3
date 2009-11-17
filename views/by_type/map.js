function(doc) {

    // !code lib/helpers/helpers.js

    if (doc.type == "Topic") {
        emit(doc.topic_type, topic_label())
    }
}
