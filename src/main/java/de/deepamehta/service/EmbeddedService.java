package de.deepamehta.service;

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

import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;



public class EmbeddedService {

    public static final EmbeddedService SERVICE = new EmbeddedService();

    private final Storage storage;
    private ServletContext servletContext;

    private EmbeddedService() {
        System.out.println("### EmbeddedService: constructing");
        this.storage = new Neo4jStorage("/Users/jri/var/db/deepamehta-db-neo4j");
    }

    // *** Service Methods (called by REST servlet) ***

    public void setServletContext(ServletContext servletContext) {
        System.out.println("### EmbeddedService: reveive servlet context");
        this.servletContext = servletContext;
        //
        init();
    }

    public Topic createTopic(String typeId, Map properties) {
        return storage.createTopic(typeId, properties);
    }

    public void setTopicProperties(long id, Map properties) {
        storage.setTopicProperties(id, properties);
    }

    public Association createAssociation(long srcTopicId, long dstTopicId, String typeId, Map properties) {
        return storage.createAssociation(srcTopicId, dstTopicId, typeId, properties);
    }

    public void createTopicType(Map properties, List fieldDefinitions) {
        storage.createTopicType(properties, fieldDefinitions);
    }

    public boolean topicTypeExists(String typeId) {
        return storage.topicTypeExists(typeId);
    }

    public void shutdown() {
        storage.shutdown();
    }

    // *** Private Helpers ****

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
        String typeId = type.getString("type_id");
        if (topicTypeExists(typeId)) {
            System.out.println("### EmbeddedService: no need to create topic type \"" + typeId + "\" (already exists)");
            return;
        }
        //
        Map properties = new HashMap();
        properties.put("type_id",             typeId);
        properties.put("type_icon_src",       type.getJSONObject("view").getString("icon_src"));
        properties.put("type_implementation", type.getString("implementation"));
        //
        List fieldDefinitions = new ArrayList();
        JSONArray fieldDefs = type.getJSONArray("fields");
        for (int i = 0; i < fieldDefs.length(); i++) {
            Map fieldDefinition = new HashMap();
            JSONObject fieldDef = fieldDefs.getJSONObject(i);
            fieldDefinition.put("prop_id",       fieldDef.getString("id"));
            fieldDefinition.put("prop_datatype", fieldDef.getJSONObject("model").getString("type"));
            fieldDefinition.put("prop_editor",   fieldDef.getJSONObject("view").getString("editor"));
            fieldDefinitions.add(fieldDefinition);
        }
        //
        createTopicType(properties, fieldDefinitions);
    }
}
