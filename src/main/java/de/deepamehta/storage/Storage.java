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

    // --- Relations ---

    public Relation createRelation(String typeId, long srcTopicId, long dstTopicId, Map properties);

    // --- Types ---

    public void createTopicType(Map<String, String> properties, List<Map> fieldDefinitions);

    public boolean topicTypeExists(String typeId);

    // --- Misc ---

    public void shutdown();
}
