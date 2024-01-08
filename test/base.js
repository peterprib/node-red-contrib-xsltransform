'use strict';
const assert=require('assert');
const SaxonEngine=require('../xsltransform/saxonEngine')
const saxonEngine=new SaxonEngine();
const fs=require('fs');
const path=require('path');
const saxon = require('saxon-js')
const saxonPlatform = saxon.getPlatform();
const { exec } = require('node:child_process');
const { readFile } = require('node:fs');

function getSaxonSEF(stylesheet,done,errorFunction=(reason)=>{throw Error(reason)}) {
	console.log({label:"xslt3",})
	const command = "xslt3 -xsl:../xsl/"+stylesheet+".xsl -export:"+stylesheet+".sef -nogo -t"
	const cwd= "tmp" //cwd=current working directory
	exec(command,{cwd:cwd}, (error, stdout, stderr) => {
		console.log("stdout:" + stdout)
		console.error("stderr:",stderr)
		 if (error) {
			errorFunction(error);
			return;
	  	}
		readFile(cwd+"/"+stylesheet+".sef", (err, data) => {
			if (err) errorFunction(err)
			else done(data)
		});
	});
}

function transform(xml,sef,params) {
	const resultStringXML = saxon.transform({
//	  stylesheetInternal: xslObject,
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
		const xmlString=fs.readFileSync('./test/'+xml+'.xml', 'utf8');
		saxonEngine.transform(
			xmlString, //.startsWith("<")?xmlString:"<data>"+xmlString+"</data>",
			xsl,
			{},
			(result)=>{
				const resultFile="./test/results/"+label;
				let expectedResult;
				try{
					expectedResult=fs.readFileSync(resultFile,'utf8');
				} catch(ex) {
					console.log("*** creating new result file "+label)
					fs.writeFileSync(resultFile,r)
					return;
				}
				assert.equal(result.replace(/\r\n/gm, "\n"),expectedResult.replace(/\r\n/gm, "\n"));
				done()
			},
			done
		)
/*
		saxonEngine.getSEF(xsl,
//		getSaxonSEF(xsl,
			(xslsef)=>{
				const xmlString=fs.readFileSync('./test/'+xml+'.xml', 'utf8');
				const r=transform(xmlString.startsWith("<")?xmlString:"<data>"+xmlString+"</data>",xslsef);
				const resultFile="./test/results/"+label;
				let expectedResult;
				try{
					expectedResult=fs.readFileSync(resultFile,'utf8');
				} catch(ex) {
					console.log("*** creating new result file "+label)
					fs.writeFileSync(resultFile,r)
					return;
				}
				assert.equal(r.replace(/\r\n/gm, "\n"),expectedResult.replace(/\r\n/gm, "\n"));
				done()
			},
			done
		)
*/
	});
}

describe("saxon", function() {
	it("compile ", function(done) {
		saxonEngine.getSEF("formatxml",()=>done())
	});
});


describe("xsltransform", function() {
	fs.readdirSync('./xsl').forEach(function(file) {
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
