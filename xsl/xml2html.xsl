<?xml version="1.0" encoding="UTF-8" ?>
<xsl:transform xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
    <xsl:output method="html" doctype-public="XSLT-compat" omit-xml-declaration="yes" encoding="UTF-8" indent="yes" />
    <xsl:template match="/">
      <hmtl>
        <head>
          <title>hmtl</title>
        </head>
        <xsl:apply-templates/>
      </hmtl>
    </xsl:template>

    <xsl:template match="@*|node()">
    
      <xsl:choose>
        <xsl:when test="self::text()">
          <td><xsl:copy/></td>
        </xsl:when>
        <xsl:otherwise>
          <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
          </xsl:copy>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:template>
</xsl:transform>
