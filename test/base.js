'use strict';
const assert=require('assert');
const SaxonEngine=require('../xsltransform/saxonEngine')
const saxonEngine=new SaxonEngine();
const path=require('path');
const saxon = require('saxon-js')
const { exec } = require('node:child_process');
const { access, constants, readdirSync, readFile, readFileSync, writeFileSync } = require('node:fs');
const cwd= "tmp" //cwd=current working directory

function transform(xml,sef,params) {
	const resultStringXML = saxon.transform({
	  stylesheetText: sef,
	  sourceText: xml,
	  destination: "serialized",
	  stylesheetParams:params
	});
	return resultStringXML.principalResult
}

function test(xml,xsl){
	const label=xml+"-"+xsl;
	it(label, function(done) {
		const file=path.join("test",xml+".xml")
		const xmlString=readFileSync(file, 'utf8');
		saxonEngine.transform(xmlString,xsl,
			{},
			(result)=>{
				const resultFile="./test/results/"+label;path.join("test","results",label)
				let expectedResult;
				try{
					expectedResult=readFileSync(resultFile,'utf8');
				} catch(ex) {
					console.log("*** creating new result file "+label)
					writeFileSync(resultFile,r)
					return;
				}
				assert.equal(result.replace(/\r\n/gm, "\n"),expectedResult.replace(/\r\n/gm, "\n"));
				done()
			},
			done
		)
	});
}

describe("saxon", function() {
	it("compile ", function(done) {
		saxonEngine.getSEF("formatxml",(sef)=>done(sef?null:"missing SEF output"))
	});
	it("removeCache ", function(done) {
		saxonEngine.removeCache("formatxml",done,done)
	});
	it("clearCache ", function(done) {
//		saxonEngine.setDebug()
		saxonEngine.clearCache(done,done)
//		saxonEngine.setDebug()

	});
	it("compile inline", function(done) {
		readFile(path.join('xsl','formatxml.xsl'), (err, data) => {
			if (err) done(err)
			else {
				const SEFFile=path.join(cwd,'testInline.xslt')
				saxonEngine.xslToSEFforce("testInline",data,
					()=>access(SEFFile, constants.F_OK, (ex)=>done(ex?ex.message:null)),
					done,
				)
				
			}
		})
	});
	it("compile inline fail" , function(done) {
		saxonEngine.xslToSEFforce("testInlineRubbish","rublish xsl",
			()=>done("sholud have failed"),
			(err)=>{
				console.log({label:"fail xsl",error:err})
				done()
			},
		)
	})
})


describe("xsltransform", function() {
	readdirSync('./xsl').forEach(function(file) {
		it("get SEF "+file, function(done) {
			try{
				saxonEngine.getSEF(path.parse(file).name,()=>done(),done)
			} catch(ex){
				console.log("*** failed "+ex.message)
				done(ex)
			}
		}).timeout(10000);
	});
	test("values","formatxml");
	test("values","removerEmptyNodes");
	test("values","removerEmptyOrNewLineTextNodes");
	test("values","xml2jsonBasic");
	test("values","XSLTJSON");
	test("values","xml2html");
//	test("values","xml2json");
	test("valuesJSON","json2xml");
});
