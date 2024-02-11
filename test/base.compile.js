'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const saxon = require('saxon-js')
const saxonPlatform = saxon.getPlatform();
//const spawn=require('child_process').spawn;
const { exec } = require('node:child_process');
const { readFile } = require('node:fs');

function getxslt3(stylesheet,done,errorFunction=(reason)=>{throw Error(reason)}) {
	console.log({label:"xslt3",})
	const command = "xslt3 -xsl:../xsl/"+stylesheet+".xsl -export:"+stylesheet+".sef -nogo -t"
	const cwd= "tmp" //cwd=current working directory
	exec(command,{cwd:cwd}, (error, stdout, stderr) => {
		console.log("stdout:" + stdout)
		console.error("stderr: ${stderr}")
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
function compile(xsl){
/*
	const doc = saxonPlatform.parseXmlFromString(xsl);
	doc._saxonBaseUri="file:///";
	return saxon.compile(doc);
*/
}
function transform(xml,xsl,params) {
	const doc = saxonPlatform.parseXmlFromString(xsl);
	doc._saxonBaseUri = "file:///";
	const sef = saxon.compile(doc);
	const resultStringXML = saxon.transform({
	  stylesheetInternal: compile(xsl),
	  sourceText: xml,
	  destination: "serialized",
	  stylesheetParams:params
	});
	return resultStringXML.principalResult
}

function test(xml,xsl){
	const label=xml+"-"+xsl;
	it(label, function() {
		const xmlString=fs.readFileSync('./test/'+xml+'.xml', 'utf8');
		const xslString=fs.readFileSync('./xsl/'+xsl+'.xsl', 'utf8');
		const r=transform(xmlString.startsWith("<")?xmlString:"<data>"+xmlString+"</data>",xslString);
		const resultFile="./test/results/"+label;
		let expectedResult;
		try{
			expectedResult=fs.readFileSync(resultFile,'utf8');
		} catch(ex) {
			console.log("*** creating new result file "+label)
			fs.writeFileSync(resultFile,r)
			return;
		}
		assert.equal(r,expectedResult);
	});
}

describe("saxon", function() {
	it("base compile ", function(done) {
		getxslt3("formatxml",()=>done(),done)
	});
});

/*
describe("xsltransform", function() {
	fs.readdirSync('./xsl').forEach(function(file) {
		it("compile "+file, function(done) {
			try{
				const xsl=fs.readFileSync(path.join('./xsl', file), "utf8");
				compile(xsl)
				done();
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
//	test("values","XSLTJSON");
	test("values","xml2html");
//	test("values","xml2json");
//	test("valuesJSON","json2xml");
});
*/