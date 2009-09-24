function(doc) {
    if (doc.type == "Topic") {
        emit(doc.topic_type, doc.fields[0].content)
    }
}
