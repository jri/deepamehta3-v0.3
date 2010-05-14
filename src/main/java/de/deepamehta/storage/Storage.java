package de.deepamehta.storage;

import de.deepamehta.service.Topic;

import java.util.Map;



public interface Storage {

    public Topic createTopic(String type, Map properties);

    public void setTopicProperties(long id, Map properties);

    public void shutdown();
}
