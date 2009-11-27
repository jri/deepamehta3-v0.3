function(doc) {

    // !code lib/helpers/helpers.js

    if (doc.type == "Topic") {
        emit(doc._id, {topic_label: topic_label(), topic_type: doc.topic_type})
    }
}
