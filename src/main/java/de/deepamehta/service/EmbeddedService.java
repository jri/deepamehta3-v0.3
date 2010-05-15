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

    public void setServletContext(ServletContext servletContext) {
        System.out.println("### EmbeddedService: reveive servlet context");
        this.servletContext = servletContext;
        //
        init();
    }

    public Topic createTopic(String type_id, Map properties) {
        return storage.createTopic(type_id, properties);
    }

    public void setTopicProperties(long id, Map properties) {
        storage.setTopicProperties(id, properties);
    }

    public Association createAssociation(long src_topic_id, long dst_topic_id, String type_id, Map properties) {
        return storage.createAssociation(src_topic_id, dst_topic_id, type_id, properties);
    }

    public void createTopicType(Map properties, List field_definitions) {
        storage.createTopicType(properties, field_definitions);
    }

    public void shutdown() {
        storage.shutdown();
    }

    // --- Private ---

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
        Map properties = new HashMap();
        properties.put("type_id",             type.getString("type_id"));
        properties.put("type_icon_src",       type.getJSONObject("view").getString("icon_src"));
        properties.put("type_implementation", type.getString("implementation"));
        //
        List field_definitions = new ArrayList();
        JSONArray field_defs = type.getJSONArray("fields");
        for (int i = 0; i < field_defs.length(); i++) {
            Map field_definition = new HashMap();
            JSONObject field_def = field_defs.getJSONObject(i);
            field_definition.put("prop_id",       field_def.getString("id"));
            field_definition.put("prop_datatype", field_def.getJSONObject("model").getString("type"));
            field_definition.put("prop_editor",   field_def.getJSONObject("view").getString("editor"));
            field_definitions.add(field_definition);
        }
        //
        createTopicType(properties, field_definitions);
    }
}
