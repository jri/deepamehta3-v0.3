function(doc) {
    if (doc.type == "Topic") {
        emit(doc._id, {name: doc.fields[0].content, topic_type: doc.topic_type})
    }
}
