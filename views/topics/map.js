function(doc) {

    // !code lib/helpers/helpers.js

    if (doc.type == "Topic") {
        emit(doc._id, {name: topic_label(), topic_type: doc.topic_type})
    }
}
