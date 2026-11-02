package org.opentripplanner.osm;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;
import org.opentripplanner.graph_builder.module.osm.storage.OsmDatabase;
import org.opentripplanner.osm.model.OsmMemberType;
import org.opentripplanner.osm.model.OsmNode;
import org.opentripplanner.osm.model.OsmNodeBuilder;
import org.opentripplanner.osm.model.OsmRelation;
import org.opentripplanner.osm.model.OsmRelationBuilder;
import org.opentripplanner.osm.model.OsmRelationMember;
import org.opentripplanner.osm.model.OsmWay;
import org.opentripplanner.osm.model.OsmWayBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Streaming XML parser for OpenStreetMap XML files (.osm / .xml).
 */
class OsmXmlParser {

  private static final Logger LOG = LoggerFactory.getLogger(OsmXmlParser.class);
  private final OsmDatabase osmdb;
  private final DefaultOsmProvider provider;
  private final Map<String, String> stringTable = new HashMap<>();

  public OsmXmlParser(OsmDatabase osmdb, DefaultOsmProvider provider) {
    this.osmdb = Objects.requireNonNull(osmdb);
    this.provider = Objects.requireNonNull(provider);
  }

  private String internalize(String s) {
    if (s == null) {
      return null;
    }
    String cached = stringTable.get(s);
    if (cached == null) {
      stringTable.put(s, s);
      return s;
    }
    return cached;
  }

  public void parse(InputStream in, OsmParserPhase phase) {
    XMLInputFactory factory = XMLInputFactory.newInstance();
    // Disable external entity resolution for security
    factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, Boolean.FALSE);
    factory.setProperty(XMLInputFactory.SUPPORT_DTD, Boolean.FALSE);

    try {
      XMLStreamReader reader = factory.createXMLStreamReader(in);
      while (reader.hasNext()) {
        int event = reader.next();
        if (event == XMLStreamConstants.START_ELEMENT) {
          String localName = reader.getLocalName();
          if (phase == OsmParserPhase.Relations && "relation".equals(localName)) {
            parseRelation(reader);
          } else if (phase == OsmParserPhase.Ways && "way".equals(localName)) {
            parseWay(reader);
          } else if (phase == OsmParserPhase.Nodes && "node".equals(localName)) {
            parseNode(reader);
          }
        }
      }
      reader.close();
    } catch (Exception e) {
      LOG.error("Error parsing OSM XML in phase " + phase + ": " + e.getMessage(), e);
    }
  }

  private void parseNode(XMLStreamReader reader) throws Exception {
    String idStr = reader.getAttributeValue(null, "id");
    String latStr = reader.getAttributeValue(null, "lat");
    String lonStr = reader.getAttributeValue(null, "lon");
    if (idStr == null || latStr == null || lonStr == null) {
      return;
    }

    long id = Long.parseLong(idStr);
    double lat = Double.parseDouble(latStr);
    double lon = Double.parseDouble(lonStr);
    OsmNodeBuilder builder = OsmNode.of().withId(id).withOsmProvider(provider).withLatLon(lat, lon);

    while (reader.hasNext()) {
      int event = reader.next();
      if (event == XMLStreamConstants.START_ELEMENT) {
        if ("tag".equals(reader.getLocalName())) {
          String k = internalize(reader.getAttributeValue(null, "k"));
          String v = internalize(reader.getAttributeValue(null, "v"));
          if (k != null && v != null) {
            builder.withTag(k, v);
          }
        }
      } else if (event == XMLStreamConstants.END_ELEMENT) {
        if ("node".equals(reader.getLocalName())) {
          break;
        }
      }
    }

    osmdb.addNode(builder.build());
  }

  private void parseWay(XMLStreamReader reader) throws Exception {
    String idStr = reader.getAttributeValue(null, "id");
    if (idStr == null) {
      return;
    }

    long id = Long.parseLong(idStr);
    OsmWayBuilder builder = OsmWay.of().withId(id).withOsmProvider(provider);

    while (reader.hasNext()) {
      int event = reader.next();
      if (event == XMLStreamConstants.START_ELEMENT) {
        String name = reader.getLocalName();
        if ("nd".equals(name)) {
          String refStr = reader.getAttributeValue(null, "ref");
          if (refStr != null) {
            builder.addNodeRef(Long.parseLong(refStr));
          }
        } else if ("tag".equals(name)) {
          String k = internalize(reader.getAttributeValue(null, "k"));
          String v = internalize(reader.getAttributeValue(null, "v"));
          if (k != null && v != null) {
            builder.withTag(k, v);
          }
        }
      } else if (event == XMLStreamConstants.END_ELEMENT) {
        if ("way".equals(reader.getLocalName())) {
          break;
        }
      }
    }

    osmdb.addWay(builder.build());
  }

  private void parseRelation(XMLStreamReader reader) throws Exception {
    String idStr = reader.getAttributeValue(null, "id");
    if (idStr == null) {
      return;
    }

    long id = Long.parseLong(idStr);
    OsmRelationBuilder builder = OsmRelation.of().withId(id).withOsmProvider(provider);

    while (reader.hasNext()) {
      int event = reader.next();
      if (event == XMLStreamConstants.START_ELEMENT) {
        String name = reader.getLocalName();
        if ("member".equals(name)) {
          String type = reader.getAttributeValue(null, "type");
          String refStr = reader.getAttributeValue(null, "ref");
          String role = internalize(reader.getAttributeValue(null, "role"));
          if (refStr != null) {
            OsmRelationMember member = new OsmRelationMember();
            member.setRef(Long.parseLong(refStr));
            member.setRole(role != null ? role : "");
            if ("node".equalsIgnoreCase(type)) {
              member.setType(OsmMemberType.NODE);
            } else if ("way".equalsIgnoreCase(type)) {
              member.setType(OsmMemberType.WAY);
            } else if ("relation".equalsIgnoreCase(type)) {
              member.setType(OsmMemberType.RELATION);
            }
            builder.addMember(member);
          }
        } else if ("tag".equals(name)) {
          String k = internalize(reader.getAttributeValue(null, "k"));
          String v = internalize(reader.getAttributeValue(null, "v"));
          if (k != null && v != null) {
            builder.addTag(k, v);
          }
        }
      } else if (event == XMLStreamConstants.END_ELEMENT) {
        if ("relation".equals(reader.getLocalName())) {
          break;
        }
      }
    }

    osmdb.addRelation(builder.build());
  }
}
