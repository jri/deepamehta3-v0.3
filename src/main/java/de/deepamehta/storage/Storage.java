package de.deepamehta.storage;

import de.deepamehta.core.Topic;
import de.deepamehta.core.Relation;

import java.util.Map;
import java.util.List;



public interface Storage {

    // --- Topics ---

    public Topic getTopic(long id);

    public List<Topic> getRelatedTopics(long topicId, List<String> excludeRelTypes);

    public Topic createTopic(String typeId, Map properties);

    public void setTopicProperties(long id, Map properties);

    public List deleteTopic(long id);

    // --- Relations ---

    public Relation getRelation(long srcTopicId, long dstTopicId);

    public Relation createRelation(String typeId, long srcTopicId, long dstTopicId, Map properties);

    public void deleteRelation(long id);

    // --- Types ---

    public void createTopicType(Map<String, Object> properties, List<Map> dataFields);

    public boolean topicTypeExists(String typeId);

    // --- Misc ---

    public void shutdown();
}
