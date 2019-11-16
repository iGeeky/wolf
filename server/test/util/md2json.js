class TreeItemsBuilder {
  constructor() {
    this.stack = []
    this.elements = []
    this.level = 0
    this.lastIndents = -1;
    this.stack.push(this.elements);
  }

  stackReset() {
    this.stack = [this.elements];
  }

  curEles() {
    console.assert(this.stack.length > 0);
    return this.stack[this.stack.length-1];
  }

  curItem() {
    const eles = this.curEles()
    const item = eles[eles.length-1];
    return item;
  }

  addItem(item, indents) {
    if (this.lastIndents === -1 || indents === this.lastIndents) { // level not changed
      this.curEles().push({item: item});
    } else {
      if (indents > this.lastIndents) { // level ++
        const storedItem = this.curItem();
        const {children = []} = storedItem;
        children.push({item: item});
        storedItem['children'] = children
        this.stack.push(children);
      } else { // level --
        if (indents === 0) {
          this.stackReset();
        } else {
          this.stack.pop();
        }
        this.curEles().push({item: item});
      }
    }

    this.lastIndents = indents;
  }
}

class Markdown2Json {
  constructor(markdownText) {
    this.lines = markdownText.split('\n')
    this.tokens = [];
    this.currentHeader = null;
    this.treeBuilder = null;
  }

  checkStore() {
    if (this.currentHeader != null) {
      if (this.treeBuilder !== null) {
        this.currentHeader.children = this.treeBuilder.elements;
        this.treeBuilder = null;
      }
      this.tokens.push(this.currentHeader);
      this.currentHeader = null;
    }
  }

  parse() {
    const regexEmptyLine = /^\s*$/;
    const regexTitle = /^\s*#\s*(.*)/;
    const regexItem = /^(\s*)\*\s*(.+)/;
    for (const line of this.lines) {
      let m;
      if (regexEmptyLine.test(line)) {
        continue;
      }

      if ((m = regexTitle.exec(line)) !== null) {
        this.checkStore();
        const title = m[1];
        this.currentHeader = {h1: title}
        continue;
      }

      if (( m = regexItem.exec(line)) !== null) {
        const spaces = m[1].length;
        const item = m[2].trim();
        if (this.treeBuilder === null) {
          this.treeBuilder = new TreeItemsBuilder();
        }
        if (item) {
          this.treeBuilder.addItem(item, spaces);
        }
        continue;
      }

      console.error('unprocessed line: %s', line)
    }

    this.checkStore();
    return this.tokens;
  }
}

function markdown2json(markdownText) {
  return new Markdown2Json(markdownText).parse();
}

function test() {
  const str = ` 
  # header 01
  # header02
  #  application
  * openresty openresty.org
  
  # user
  * or_index openresty-index
      * permission
          * INDEX
          * INDEX_CN
          * INDEX_EN
        * role
          * role1
          * role2
  * or_en openresty-english
      * permission
          * INDEX
        * role
            * en
  * or_cn openresty-chinese
      * permission
          * INDEX
      * role
          * cn
  `;
  const tokens = markdown2json(str);
  for (const token of tokens) {
    console.log(token);
  }
}

exports.markdown2json = markdown2json;
