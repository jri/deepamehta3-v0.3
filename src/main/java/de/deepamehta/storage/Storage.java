package de.deepamehta.storage;

import de.deepamehta.service.Topic;
import de.deepamehta.service.Association;

import java.util.Map;
import java.util.List;



public interface Storage {

    public Topic getTopic(long id);

    public List<Topic> getRelatedTopics(long topicId, List<String> excludeRelTypes);

    public Topic createTopic(String typeId, Map properties);

    public void setTopicProperties(long id, Map properties);

    public Association createAssociation(long srcTopicId, long dstTopicId, String typeId, Map properties);

    public void createTopicType(Map<String, String> properties, List<Map> fieldDefinitions);

    public boolean topicTypeExists(String typeId);

    public void shutdown();
}
