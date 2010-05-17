package de.deepamehta.service;

import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.Relation;
import de.deepamehta.storage.Storage;
import de.deepamehta.storage.neo4j.Neo4jStorage;

import org.codehaus.jettison.json.JSONObject;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;

import javax.servlet.ServletContext;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.IOException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;



public class EmbeddedService {

    public static final EmbeddedService SERVICE = new EmbeddedService();

    private Map<String, TopicType> topicTypes = new HashMap();

    private final Storage storage;
    private ServletContext servletContext;

    private EmbeddedService() {
        System.out.println("### EmbeddedService: constructing");
        this.storage = new Neo4jStorage("/Users/jri/var/db/deepamehta-db-neo4j", topicTypes);
    }



    // ************************************************
    // *** Service Methods (called by REST servlet) ***
    // ************************************************



    public void setServletContext(ServletContext servletContext) {
        System.out.println("### EmbeddedService: reveive servlet context");
        this.servletContext = servletContext;
        //
        init();
    }

    // --- Topics ---

    public Topic getTopic(long id) {
        return storage.getTopic(id);
    }

    public List<Topic> getRelatedTopics(long topicId, List<String> excludeRelTypes) {
        return storage.getRelatedTopics(topicId, excludeRelTypes);
    }

    public Topic createTopic(String typeId, Map properties) {
        return storage.createTopic(typeId, properties);
    }

    public void setTopicProperties(long id, Map properties) {
        storage.setTopicProperties(id, properties);
    }

    public List deleteTopic(long id) {
        return storage.deleteTopic(id);
    }

    // --- Relations ---

    /**
     * Returns the relation between the two topics (regardless of type and direction).
     * If no such relation exists null is returned.
     * If more than one relation exists, only the first one is returned.
     */
    public Relation getRelation(long srcTopicId, long dstTopicId) {
        return storage.getRelation(srcTopicId, dstTopicId);
    }

    public Relation createRelation(String typeId, long srcTopicId, long dstTopicId, Map properties) {
        return storage.createRelation(typeId, srcTopicId, dstTopicId, properties);
    }

    public void deleteRelation(long id) {
        storage.deleteRelation(id);
    }

    // --- Types ---

    public void createTopicType(Map properties, List dataFields) {
        TopicType topicType = new TopicType(properties, dataFields);
        String typeId = topicType.getProperty("type_id");
        // store in DB
        if (!topicTypeExists(typeId)) {
            storage.createTopicType(properties, dataFields);
        } else {
            System.out.println("  # EmbeddedService: no need to create topic type \"" + typeId + "\" (already exists)");
        }
        // cache in memory
        topicTypes.put(typeId, topicType);
    }

    public boolean topicTypeExists(String typeId) {
        return storage.topicTypeExists(typeId);
    }

    // --- Misc ---

    public void shutdown() {
        storage.shutdown();
    }



    // ************************
    // *** Private Helpers ****
    // ************************



    private void init() {
        try {
            InputStream is = servletContext.getResourceAsStream("/WEB-INF/classes/types.json");
            if (is == null) {
                throw new RuntimeException("resource /WEB-INF/classes/types.json not found");
            }
            BufferedReader in = new BufferedReader(new InputStreamReader(is));
            String line;
            StringBuilder json = new StringBuilder();
            while ((line = in.readLine()) != null) {
                json.append(line);
            }
            createTypes(json.toString());
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    private void createTypes(String json) {
        try {
            JSONArray types = new JSONArray(json);
            for (int i = 0; i < types.length(); i++) {
                JSONObject type = types.getJSONObject(i);
                createType(type);
            }
        } catch (Throwable e) {
            throw new RuntimeException("ERROR while processing /WEB-INF/classes/types.json", e);
        }
    }

    private void createType(JSONObject type) throws JSONException {
        //
        JSONObject view = type.getJSONObject("view");
        Map properties = new HashMap();
        properties.put("type_id", type.getString("type_id"));
        properties.put("type_icon_src", view.getString("icon_src"));
        if (view.has("label_field")) {
            properties.put("type_label_field", view.getString("label_field"));
        }
        properties.put("type_implementation", type.getString("implementation"));
        //
        List dataFields = new ArrayList();
        JSONArray fieldDefs = type.getJSONArray("fields");
        for (int i = 0; i < fieldDefs.length(); i++) {
            Map dataField = new HashMap();
            JSONObject fieldDef = fieldDefs.getJSONObject(i);
            dataField.put("field_id",       fieldDef.getString("id"));
            dataField.put("field_datatype", fieldDef.getJSONObject("model").getString("type"));
            if (fieldDef.has("view")) {
                dataField.put("field_editor",   fieldDef.getJSONObject("view").getString("editor"));
            }
            dataFields.add(dataField);
        }
        //
        createTopicType(properties, dataFields);
    }
}
