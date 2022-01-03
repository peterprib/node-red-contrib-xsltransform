<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:math="http://www.w3.org/2005/xpath-functions/math" xmlns:xs="http://www.w3.org/2001/XMLSchema" exclude-result-prefixes="xs math" version="3.0">
   <xsl:output indent="yes" />
   <xsl:template match="data">
      <xsl:copy-of select="json-to-xml(.)" />
   </xsl:template>
</xsl:stylesheet>
