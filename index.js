import Parser from "tree-sitter";
import java from "tree-sitter-java";
import { readFileSync } from "fs";

const { Query } = Parser;

const args = process.argv.slice(2);

if (args.length != 1) {
  console.error("Usage: node index.js <source.java>");
  process.exit(1);
}

const sourceCode = readFileSync(args[0], "utf8");

const parser = new Parser();
parser.setLanguage(java);

const tree = parser.parse(sourceCode);

function write(str){
  process.stdout.write(str);
}

function writeln(str){
  if(str === undefined)
  {
    str = ''
  }
  process.stdout.write(str + '\n');
}

function printClass(node){
  const query = new Query(
    java,
    `(class_declaration
      name: (identifier) @class_name
      )@class_declaration`
  );

  var captures = query.captures(node)
  captures.forEach(element => {
    if(element.node.type === 'identifier'){
      writeln(element.node.text + ' is');
    }
  });
  captures.forEach(element => {
    if(element.node.type !== 'identifier'){
      printClassBody(element.node.children[2]);
    }
  });
}

function goto1(node, type){
  return node.children.filter(n => n.type === type)[0];
}

function goto2(node, type){
  return node.children.filter(n => n.type === type)[1];
}

function printClassBody(node){

  const query = new Query(
    java,
    `(class_body
      (method_declaration) @method_declaration
      ) `
  );
  var captures = query.captures(node);
  captures.forEach(capture => {

    const formArgs = goto1(capture.node, 'formal_parameters');
    const ident = goto1(capture.node, 'identifier');

    write('  ' + ident.text + '(');
    printFormArgs(formArgs);
    writeln(')' +  ' =>');

    printImpl(goto1(capture.node, 'block'));

  })
}

function printVarDecl(node){
  write('    ' + goto1(node, 'identifier').text + ' := ');
  printBinExpr(goto1(node,'binary_expression'));
  writeln();
}

function printBinExpr(node){
  write(goto1(node, 'identifier').text + ' ');
  write(goto1(node, '+').text + ' ');
  write(goto2(node, 'identifier').text);
}

function printReturn(node){
  write('    ' + goto1(node,'identifier').text)
  writeln();
}

function printImpl(node){
  printVarDecl(goto1(goto1(node, 'local_variable_declaration'),'variable_declarator'));
  printReturn(goto1(node, 'return_statement'));
}

function printFormArgs(node){
  const query = new Query(
    java,
    `(formal_parameters (formal_parameter type: (integral_type) name: (identifier)) @param) `
  );
  var captures = query.captures(node);
  write(captures.map(capture =>{
    return capture.node.children[1].text + ' ' +
    replace_basic_type(capture.node.children[0].text);
  }).join(', '));
}

function replace_basic_type(type){
  switch (type){
    case 'int':
      return 'i32';
    default:
      throw 'not implemented for type ' + type;
  }
}

printClass(tree.rootNode);
