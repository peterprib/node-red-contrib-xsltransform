'use strict';
const assert = require('node:assert').strict;
const fs=require('fs');
const helper=require("node-red-node-test-helper");
const transformNode = require("../xsltransform/xsltransform.js");
const saxonEngine = require('../xsltransform/saxonEngine.js');
const outHelper={id :"outHelper",type :"helper"}
helper.init(require.resolve('node-red'));

function test(label,node,dataFile,repeat=1){
	it(label, function(done) {
		try{
			const xmlString=fs.readFileSync('./test/'+dataFile+'.xml', 'utf8');
			const n=Object.assign({wires : [[outHelper.id]]},node)
			const flow = [n,outHelper];

			helper.load(transformNode, flow, function() {
				try{
					const n=helper.getNode(node.id);
					const outHelperNode=helper.getNode(outHelper.id);
					let c=repeat-1;
					outHelperNode.on("input", function(msg) {
						console.log("outHelper count:"+c+" topic:"+msg.topic)
						if(c-- >= 1 )return
						console.log("outHelper payload:"+msg.payload);
						done()
					});
					console.log("sending "+label)
					for(let i=0; i< repeat; i++) {
						n.receive({
							topic:"test "+i,
							payload : xmlString
						});
					}
				} catch(ex){
					done(ex);
				}
			});
		} catch(ex) {
			done(ex);
		}
	}).timeout(repeat>1?500*repeat:10000);
}
function buildNode(xsl) {
	return {
		id: "xsltNode",
		type: "xslTransform",
		name: "xslTransform Name",
		param: "",
		xsl:xsl
	}
}
const nodeInline=buildNode("<?xml version=\"1.0\"?>\n<xsl:stylesheet version=\"1.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\">\n<xsl:output method=\"text\"/>\n\n<xsl:template match=\"/\">{\n    <xsl:apply-templates select=\"*\"/>}\n</xsl:template>\n\n<!-- Object or Element Property-->\n<xsl:template match=\"*\">\n    \"<xsl:value-of select=\"name()\"/>\" :<xsl:call-template name=\"Properties\">\n        <xsl:with-param name=\"parent\" select=\"'Yes'\"> </xsl:with-param>\n    </xsl:call-template>\n</xsl:template>\n\n<!-- Array Element -->\n<xsl:template match=\"*\" mode=\"ArrayElement\">\n    <xsl:call-template name=\"Properties\"/>\n</xsl:template>\n\n<!-- Object Properties -->\n<xsl:template name=\"Properties\">\n    <xsl:param name=\"parent\"></xsl:param>\n    <xsl:variable name=\"childName\" select=\"name(*[1])\"/>\n    <xsl:choose>            \n        <xsl:when test=\"not(*|@*)\"><xsl:choose><xsl:when test=\"$parent='Yes'\"> <xsl:text>&quot;</xsl:text><xsl:value-of select=\".\"/><xsl:text>&quot;</xsl:text></xsl:when>\n                <xsl:otherwise>\"<xsl:value-of select=\"name()\"/>\":\"<xsl:value-of  select=\".\"/>\"</xsl:otherwise>\n            </xsl:choose>           \n        </xsl:when>                \n        <xsl:when test=\"count(*[name()=$childName]) > 1\">{ \"<xsl:value-of  select=\"$childName\"/>\" :[<xsl:apply-templates select=\"*\" mode=\"ArrayElement\"/>] }</xsl:when>\n        <xsl:otherwise>{\n            <xsl:apply-templates select=\"@*\"/>\n            <xsl:apply-templates select=\"*\"/>\n            }</xsl:otherwise>\n    </xsl:choose>\n    <xsl:if test=\"following-sibling::*\">,</xsl:if>\n</xsl:template>\n\n<!-- Attribute Property -->\n<xsl:template match=\"@*\">\"<xsl:value-of select=\"name()\"/>\" : \"<xsl:value-of select=\".\"/>\",\n</xsl:template>\n</xsl:stylesheet>");

describe('transform', function() {
	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});

	it('should be loaded', function(done) {
		helper.load(transformNode, [nodeInline], function() {
			try{
				const n = helper.getNode(nodeInline.id);
				assert.equal(n.name, nodeInline.name)
				assert.equal(n.type, nodeInline.type)
				assert.equal(n.xsl, nodeInline.xsl)
			} catch(ex) {
				done(ex.mes);
				return;
			}
			done()
		});
	});
	test("inline",nodeInline,"values")
	test("formatxml",buildNode("formatxml"),"values")
	test("xml2jsonBasic",buildNode("xml2jsonBasic"),"values")
	test("xml2jsonBasic",buildNode("xml2jsonBasic"),"values",100)
});