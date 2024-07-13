
var xmlMain; // 读入的知识库转换为DOM
var fileName, libName; // 读入的知识库文件名及知识库名
var lastStr; // 暂存最近的文字

var switching = false; // 表示正在切换章节
var modify = false;

var lastVolume = -1, lastChapter = -1, lastSection = -1; // 避免在未保存的时候切到其它章节导致误保存
var editScroll = 0;

var undoList = new Array();
var undoIndex = -1;

var tabList = [
	{title: "新建", action: selectTab, args: "tool-new",},
	{title: "保存", action: selectTab, args: "tool-save",},
	{title: "删除", action: selectTab, args: "tool-del",},
	{title: "段落", action: selectTab, args: "tool-para",},
	{title: "添加重点", action: selectTab, args: "tool-key",},
	{title: "添加图片", action: selectTab, args: "tool-img",},
	{title: "添加链接", action: selectTab, args: "tool-anchor",},
	{title: "添加表格", action: selectTab, args: "tool-table"}
];
var curTab = null;

window.onbeforeunload = function(e)
{
	return "no";
}

function create(title, parent, fn)
{
	var e = document.createElement(title);
	parent && parent.appendChild(e);
	fn && fn(e);
	return e;
}

var Bind = function(object, fun) {
	var args = Array.prototype.slice.call(arguments).slice(2);
	return function() {
		return fun.apply(window, Array(object, args));
	}
}

function createNode(title, text)
{
	var d = document.createElement(title);
	text && d.appendChild(document.createTextNode(text));
	return d;
}

function createBrNode(title)
{
	var d = document.createElement(title);
	d.appendChild(document.createElement("br"));
	return d;
}

function newInput(doc)
{
	let s = doc.getSelection();
	if (!s.rangeCount) {
		return;
	}
	let r = s.getRangeAt(0);
	let c = r.endOffset;
	let d = document.createElement("div");
	d.appendChild(doc.body.firstChild);
	doc.body.appendChild(d);
	r.setStart(d.firstChild, c);
	r.collapse(true);
}

function initEdit(e)
{
	e.contentEditable = true;
	e.designMode = "on";

	let l = document.createElement("link");
	l.setAttribute("rel", "stylesheet");
	l.setAttribute("type", "text/css");
	l.setAttribute("href", "css/style.css");

	e.head.appendChild(l);
}

function insertTextBefore(p, t)
{
	let tt = document.createTextNode(t);
	if (!p.firstChild) {
		p.appendChild(tt);
	}
	else if (p.firstChild.nodeType != Node.TEXT_NODE) {
		console.log("意外的粘贴位置！");
	}
	else {
		p.insertBefore(tt, p.firstChild);
		p.normalize();
	}
}

function insertTextAfter(p, t)
{
	let tt = document.createTextNode(t);
	if (p.firstChild && p.firstChild.nodeType != Node.TEXT_NODE) {
		console.log("意外的粘贴位置！");
	}
	else {
		p.appendChild(tt);
		p.normalize();
	}
}

function initMake()
{
	let DEFAULT_VERSION = 8.0;
	let ua = navigator.userAgent.toLowerCase();
	if (ua.indexOf("msie") > -1) {
		window.write("暂不支持IE浏览器使用");
		return;
	}

	// 编辑器初始化
	const e = document.getElementById("showi").contentDocument;
	initEdit(e);

	// 监视编辑器的变化，用于在首次输入内容时，将第一个文字转变为div
	let compositionInput = false;
	const config = { characterData: true, childList: true, subtree: true };
	const observer = new MutationObserver(function (mutationsList, observer) {
		if (compositionInput) {
			return;
		}
		for (let mutation of mutationsList) {
			if (mutation.type == "characterData" || mutation.type == "childList") {
				if (switching) {
					switching = false;
				}
				else {
					modify = true;
				}
			}
			if (e.body.firstChild && e.body.firstChild.nodeName.toLowerCase() == "#text") {
				newInput(e);
			}
		}
	});
	observer.observe(e.body, config);

	// 这个监听是避免用输入法输入时第一个按键被识别为字母
	e.addEventListener("compositionstart", function(event) {
		compositionInput = true;
	})
	e.addEventListener("compositionend", function(event) {
		compositionInput = false;
		if (e.body.firstChild && e.body.firstChild.nodeName.toLowerCase() == "#text") {
			newInput(e);
		}
	});

	// 禁止粘贴格式处理
	e.addEventListener("paste", function(event) {
		event.preventDefault();

		let text = (event.clipboardData || window.clipboardData).getData("text");
		text = text.replaceAll("\r", "");
		let l = text.split("\n");

		let selection = e.getSelection();
		if (!selection.rangeCount) {
			return;
		}
		var range = selection.getRangeAt(0);

		// 在同一个节点内粘贴
		if (range.startContainer == range.endContainer) {
			let b = e.body;
			// 如果在输入框的最开头粘贴
			if (range.startContainer == b) {
				if (b.firstChild) {
					insertTextBefore(b.firstChild, l[l.length - 1]);
					for (let i = l.length - 2; i >= 0; i--) {
						b.insertBefore(l[i].length ? createNode("div", l[i]) : createBrNode("div"), b.firstChild);
					}
				}
				else {
					for (let i = 0; i < l.length; i++) {
						b.appendChild(l[i].length ? createNode("div", l[i]) : createBrNode("div"));
					}
				}
			}
			// 如果在最后一个空段落里粘贴
			else if (range.startContainer.parentNode == b) {
				for (let i = l.length - 1; i >= 0; i--) {
					b.insertBefore(l[i].length ? createNode("div", l[i]) : createBrNode("div"), range.startContainer.nextSibling);
				}
				range.startContainer.remove();b
			}
			// 如果在笔记框里粘贴一个空段落（段落里只有一个BR），在这里单独处理
			else if (range.startContainer.childNodes.length == 1 && range.startContainer.childNodes[0].nodeName.toUpperCase() == "BR") {
				for (let i = l.length - 1; i >= 0; i--) {
					let n = range.startContainer.cloneNode(false);
					insertTextBefore(n, l[i]);
					range.startContainer.parentNode.insertBefore(n, range.startContainer.nextSibling);
				}
				range.startContainer.remove();
			}
			// 如果输入框里有内容，但仅仅是插入
			else if (range.collapsed) {
				let r = range.startContainer.parentNode;
				// 插入点在开头时不需要拆分
				if (range.startOffset == 0) {
					insertTextBefore(r, l[l.length - 1]);
					for (let i = 0; i < l.length - 1; i++) {
						r.parentNode.insertBefore(l[i].length ? createNode("div", l[i]) : createBrNode("div"), r);
					}
				}
				// 插入点在结尾时不需要拆分
				else if (range.startOffset == range.startContainer.length) {
					insertTextAfter(r, l[0]);
					for (let i = l.length - 1; i > 0; i--) {
						r.parentNode.insertBefore(l[i].length ? createNode("div", l[i]) : createBrNode("div"), r.nextSibling);
					}
				}
				// 插入点在中间
				else {
					let t = range.startContainer.splitText(range.startOffset);
					if (l.length <= 1) {
						r.insertBefore(document.createTextNode(l[0]), t);
						r.normalize();
					}
					else {
						let d = document.createElement(range.startContainer.parentNode.nodeName);
						d.appendChild(t);
						r.parentNode.insertBefore(d, r.nextSibling);
						insertTextAfter(r, l[0]);
						insertTextBefore(d, l[l.length - 1]);
						for (let i = l.length - 2; i > 0; i--) {
							r.parentNode.insertBefore(l[i].length ? createNode("div", l[i]) : createBrNode("div"), r.nextSibling);
						}
					}
				}
			}
			// 如果替掉了整段
			else if (range.startOffset == 0 && range.endOffset == range.endContainer.length) {
				let r = range.startContainer.parentNode;
				let d = l[0].length ? createNode("div", l[0]) : createBrNode("div");
				r.replaceWith(d);
				r.remove();
				for (let i = l.length - 1; i > 0; i--) {
					d.parentNode.insertBefore(l[i].length ? createNode("div", l[i]) : createBrNode("div"), d.nextSibling);
				}
			}
			// 如果只替掉了中间的一部分
			else {
				let r = range.startContainer.parentNode;
				let t = range.startContainer.splitText(range.startOffset);
				if (l.length <= 1) {
					let n = t.splitText(range.endOffset);
					t.remove();
					r.insertBefore(document.createTextNode(l[0]), n);
					r.normalize();
				}
				else {
					let d = document.createElement(range.startContainer.parentNode.nodeName);
					d.appendChild(t.splitText(range.endOffset));
					t.remove();
					r.parentNode.insertBefore(d, r.nextSibling);
					insertTextAfter(r, l[0]);
					insertTextBefore(d, l[l.length - 1]);
					for (let i = 1; i < l.length - 1; i++) {
						d.parentNode.insertBefore(l[i] ? createNode("div", l[i]) : createBrNode("div"), d);
					}
				}
			}
		}
		// 跨越多个节点粘贴
		else {
			let s = range.startContainer.parentNode, e = range.endContainer.parentNode;
			// 如果开头和结尾都在段的边缘，寻找前后是否还有兄弟节点
			if (range.startOffset == 0 && range.endOffset == range.endContainer.length) {
				range.deleteContents();
				for (let i = 0; i < l.length; i++) {
					e.parentNode.insertBefore(l[i] ? createNode("div", l[i]) : createBrNode("div"), e);
				}
				s.remove();
				e.remove();
			}
			// 如果末尾位于段的末尾，开头不位于段的开始
			else if (range.endOffset == range.endContainer.length) {
				range.deleteContents();
				insertTextAfter(s, l[0]);
				for (let i = l.length - 1; i > 0; i--) {
					s.parentNode.insertBefore(l[i] ? createNode("div", l[i]) : createBrNode("div"), s.nextSibling);
				}
				e.remove();
			}
			// 其它情况：开头位于段的起始，末尾不位于段的末尾，或者都不在起始末尾
			else {
				range.deleteContents();
				if (l.length <= 1) {
					insertTextBefore(e, l[0]);
					insertTextBefore(e, s.firstChild.wholeText);
					s.remove();
				}
				else {
					if (s.firstChild.length) {
						insertTextAfter(s, l[0]);
					}
					else {
						s.remove();
					}
					insertTextBefore(e, l[l.length - 1]);
					for (let i = 1; i < l.length - 1; i++) {
						e.parentNode.insertBefore(l[i] ? createNode("div", l[i]) : createBrNode("div"), e);
					}
				}
			}
		}
	})

	// 创建工具栏
	const tab = document.getElementById("tool");
	for (var i = 0; i < tabList.length; ++i) {
		var t = create("div", tab);
		t.className = "tabbtn";
		t.innerHTML = tabList[i].title;
		t.value = tabList[i].args;

		t.addEventListener("click", Bind(t, tabList[i].action, tabList[i].args));
		if (!curTab) {
			selectTab(t);
		}
	}
}

function selectTab(e)
{
	if (curTab) {
		curTab.style.height = "";
		curTab.style.backgroundColor = "#f8f8f8";
		curTab.style.color = "";
		document.getElementById(curTab.value).style.display = "none";
	}

	e.style.height = "40px";
	e.style.backgroundColor = "#38f";
	e.style.color = "#fff";
	document.getElementById(e.value).style.display = "";
	curTab = e;
}

function openFile(f)
{
	document.getElementById("curfile").innerHTML = "当前知识库：未打开";
	
	// 获取读取我文件的File对象
	var selectedFile = f.files[0];
	if (!selectedFile) {
		alert("打开知识库文件失败！");
		return;
	}
	
	clearAllSelects("curVolume");
	clearAllSelects("curChapter");
	clearAllSelects("curSection");
	clearAllSelects("selectVolume");
	clearAllSelects("selectChapter");
	clearAllSelects("selectSection");
	
	fileName = selectedFile.name; // 读取选中文件的文件名

	var reader = new FileReader(); // 这是核心，读取操作就是由它完成.
	reader.readAsText(selectedFile);
	reader.onload = function(evt) {
		var i = evt.target.result.indexOf("<?xml");
		if (i < 0) {
			alert("知识库格式可能已被破坏，无法打开！");
			return;
		}
		var t = evt.target.result.substr(i);

		xmlMain = (new DOMParser()).parseFromString(t, "text/xml");
		if (!xmlMain) {
			alert("分析失败，知识库文件成分不完整！");
			return;
		}
		
		var k = xmlMain.getElementsByTagName("key");
		if (!k.length || k[0].childNodes[0].nodeValue != "ThatsThePoint") {
			alert("文件错误，无法找到知识库文件头！");
			return;
		}
		
		libName = xmlMain.getElementsByTagName("title")[0].childNodes[0].nodeValue;
		
		refreshVolumeList("cur", "first");
		refreshVolumeList("sel", "first");
		
		// 清空状态，防止重新读取时不读取。
		f.outerHTML = f.outerHTML;
		document.getElementById("curfile").innerHTML = "当前知识库：" + libName;
		
		gotoSection();
	}
}

function getParentBlock(e)
{
	if (e.nodeType == Node.TEXT_NODE) {
		e = e.parentNode;
	}
	while(e && e.nodeName.toLowerCase() == "span") {
		e = e.parentNode;
	}
	if (e && e.nodeName.toLowerCase() == "p") {
		return e;
	}
	else if (e && e.nodeName.toLowerCase() == "div") {
		if (e.parentNode) {
			let c = e.parentNode.getAttribute("class");
			if (c && c.toLowerCase() == "ttp_mark") {
				return e.parentNode;
			}
		}
		return e;
	}
	else {
		return e;
	}
}

function openImage(f)
{
	let fr = new FileReader();
	fr.onload = function(e) {
		let edit = document.getElementById("showi").contentDocument;
		let selObj = edit.getSelection();
		if (!selObj.rangeCount) {
			return;
		}
		let range = selObj.getRangeAt(0);

		addUndo();
		let d = document.createElement("div");
		d.setAttribute("style", "text-align:center;");
		let i = document.createElement("img");
		i.setAttribute("src", fr.result);
		i.setAttribute("title", "img");
		d.appendChild(i);

		if (range.startContainer == edit.body) {
			edit.body.appendChild(d);
		}
		else {
			let e = getParentBlock(range.startContainer);
			e.parentNode.insertBefore(d, e.nextSibling);
		}

		f.outerHTML = f.outerHTML;
	}
	fr.readAsDataURL(f.files[0]);
}

function wrapText(context, text, x, y, maxWidth, lineHeight, verticalAlign)
{
	var words = text.split("");
	var testline = '';
	var lineindex = new Array();
	var i = 0;

	for(var n = 0; n < words.length; n++) {
		testline += words[n];
		if (context.measureText(testline).width > maxWidth && n > 0) {
			lineindex[i] = n;
			++i;
			testline = '' + words[n];
		}
	}
	lineindex[i] = words.length;
	++i;

	if (verticalAlign == "middle") {
		y -= (lineHeight * i) / 2;
	}

	var u = 0;
	for (var n = 0; n < i; n++) {
		context.fillText(text.substr(u, lineindex[n] - u), x, y);
		u = lineindex[n];
		y += lineHeight;
	}
}

function saveFile(type)
{
	var blob;
	if (type == "image") {
		var can = document.createElement("canvas");
		var ctx = can.getContext("2d");
		can.width = 300;
		can.height = 300;

		var dlLink = document.createElement("a");
		if (fileName) {
			dlLink.download = fileName;
		}
		else {
			dlLink.download = prompt("请输入文件名！", "新建知识库.jpeg");
			if (dlLink.download == "null") {
				return;
			}
		}
		if (dlLink.download.indexOf(".jpeg") < 0 && dlLink.download.indexOf(".jpg")) {
			if (dlLink.download.indexOf(".") >= 0) {
				dlLink.download = dlLink.download.substring(0, dlLink.download.indexOf(".")) + ".jpeg";
			}
			else {
				dlLink.download += ".jpeg";
			}
		}

		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(0, 0, 300, 300);

		var image = new Image();
		image.src = "./img/icon.png";
		image.onload = function() {
			ctx.globalAlpha = 0.2;
			ctx.drawImage(image, 0, 0, 300, 300);

			ctx.globalAlpha = 1;
			ctx.font = "bold 50px Arial,微软雅黑,黑体";
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillStyle = "#000000";
			wrapText(ctx, libName, 150, 150, 250, 50, "middle");

			var arr = can.toDataURL("image/jpeg", 0.8).split(","),
				mime = arr[0].match(/:(.*?);/)[1],
				bstr = atob(arr[1]),
				n = bstr.length,
				xml = makeSource(),
				buffer = new Uint8Array(n);
			if (!xml) {
				alert("尚未创建知识库！");
				return;
			}

			while(n--) {
				buffer[n] = bstr.charCodeAt(n);
			}

			blob = new Blob([buffer, xml]);
			dlLink.href = URL.createObjectURL(blob);
			dlLink.style = "display: none;";
			document.body.appendChild(dlLink);
			dlLink.click();
			document.body.removeChild(dlLink);
		}
	}
	else {
		var xml = makeSource();
		blob = new Blob([xml]);
		var dlLink = document.createElement("a");
		if (fileName) {
			dlLink.download = fileName;
		}
		else {
			dlLink.download = prompt("请输入文件名！", "新建知识库.xml");
			if (dlLink.download == "null") {
				return;
			}
		}
		if (dlLink.download.indexOf(".xml") < 0) {
			if (dlLink.download.indexOf(".") >= 0) {
				dlLink.download = dlLink.download.substring(0, dlLink.download.indexOf(".")) + ".xml";
			}
			else {
				dlLink.download += ".xml";
			}
		}
		dlLink.href = URL.createObjectURL(blob);
		dlLink.style = "display: none;";
		document.body.appendChild(dlLink);
		dlLink.click();
		document.body.removeChild(dlLink);
	}
}

function clearInput()
{
	document.getElementById("showi").contentDocument.body.innerHTML = "";
	document.getElementById("origin").value = "";
	document.getElementById("quote").value = "";
}

function checkChange()
{
	if (xmlMain) {
		if (!confirm("当前有已经读入的知识库！\n【库名】：" + libName + "\n【文件名】：" + ((fileName.length > 0) ? fileName : "未保存") + "\n您确定要重新读入新知识库吗？\n注意：若当前知识库被修改，也应重新读入知识库。")) {
			if(window.event) {
				//IE中阻止函数器默认动作的方式
				window.event.returnValue = false;
			}
			else {
				//阻止默认浏览器动作(W3C)
				e.preventDefault();
			}
		}
	}
}

function clearAllSelects(id)
{
	let s = document.getElementById(id);
	if (!s) {
		return;
	}
	for (let i = s.length - 1; i >= 0; i--) {
		s.remove(i);
	}
}

function refreshVolumeList(target, sel)
{
	if (!xmlMain) {
		return;
	}
	
	var vs = document.getElementById((target == "cur") ? "curVolume" : "selectVolume");
	var v = xmlMain.getElementsByTagName("volume");
	
	clearAllSelects((target == "cur") ? "curVolume" : "selectVolume");
	clearAllSelects((target == "cur") ? "curChapter" : "selectChapter");
	clearAllSelects((target == "cur") ? "curSection" : "selectChapter");
	for (var i = 0; i < v.length; i++) {
		var y = document.createElement('option');
		y.text = v[i].getElementsByTagName("title")[0].childNodes[0].nodeValue;
		vs.add(y);
	}
	
	switch(sel)
	{
	case "first":
		vs.selectedIndex = 0;
		break;
		
	case "last":
		vs.selectedIndex = vs.length - 1;
		break;
	}
	
	if (v.length > 0) {
		refreshChapterList(target, sel);
	}
}

function refreshChapterList(target, sel)
{
	if (!xmlMain) {
		return;
	}
	
	clearAllSelects((target == "cur") ? "curChapter" : "selectChapter");
	clearAllSelects((target == "cur") ? "curSection" : "selectChapter");
	
	var vs = document.getElementById((target == "cur") ? "curVolume" : "selectVolume");
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		return;
	}
	
	var cs = document.getElementById((target == "cur") ? "curChapter" : "selectChapter");
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	
	for (var i = 0; i < c.length; i++) {
		var y = document.createElement('option');
		y.text = c[i].getElementsByTagName("title")[0].childNodes[0].nodeValue;
		cs.add(y);
	}
	
	switch(sel)
	{
	case "first":
		cs.selectedIndex = 0;
		break;
		
	case "last":
		cs.selectedIndex = cs.length - 1;
		break;
	}
	
	if (c.length > 0) {
		refreshSectionList(target, sel);
	}
}

function refreshSectionList(target, sel)
{
	if (!xmlMain) {
		return;
	}
	
	clearAllSelects((target == "cur") ? "curSection" : "selectSection");
	
	var vs = document.getElementById((target == "cur") ? "curVolume" : "selectVolume");
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		return;
	}
	
	var cs = document.getElementById((target == "cur") ? "curChapter" : "selectChapter");
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	if (c.length <= 0) {
		return;
	}
	
	var ss = document.getElementById((target == "cur") ? "curSection" : "selectSection");
	var s = c[cs.selectedIndex].getElementsByTagName("section");
	if (s.length <= 0) {
		return;
	}
	
	for (var i = 0; i < s.length; i++) {
		var y = document.createElement('option');
		y.text = s[i].getElementsByTagName("title")[0].childNodes[0].nodeValue;
		ss.add(y);
	}
	
	switch(sel)
	{
	case "first":
		ss.selectedIndex = 0;
		break;
		
	case "last":
		ss.selectedIndex = ss.length - 1;
		break;
	}
}

function getNode(target, type, index) // 第一个参数为目标，第二个参数是选择卷章节，第三个参数为序号，-1为当前
{
	if (!xmlMain) {
		return null;
	}
	
	if (type == "library") {
		return xmlMain.getElementsByTagName("library")[0];
	}
	
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		return null;
	}
	var vs = document.getElementById((target == "cur") ? "curVolume" : "selectVolume");
	if (type == "volume") {
		if (index < 0) {
			return v[vs.selectedIndex];
		}
		else {
			if (index >= v.length) {
				index = v.length - 1;
			}
			return v[index];
		}
	}
	
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	if (c.length <= 0) {
		return null;
	}
	var cs = document.getElementById((target == "cur") ? "curChapter" : "selectChapter");
	if (type == "chapter") {
		if (index < 0) {
			return c[cs.selectedIndex];
		}
		else {
			if (index >= c.length) {
				index = c.length - 1;
			}
			return c[index];
		}
	}
	
	var s = c[cs.selectedIndex].getElementsByTagName("section");
	if (s.length <= 0) {
		return null;
	}
	var ss = document.getElementById((target == "cur") ? "curSection" : "selectSection");
	if (type == "section") {
		if (index < 0) {
			return s[ss.selectedIndex];
		}
		else {
			if (index >= s.length) {
				index = s.length - 1;
			}
			return s[index];
		}
	}
	
	return null;
}

function makeNew(str)
{
	var title, node;
	
	switch(str)
	{
	case "section":
		title = prompt("请输入新建的节名，取消则放弃新建", "新建节");
		if (!title) {
			return;
		}
		node = getNode("cur", "chapter", -1);
		if (!node) {
			return;
		}
		try {
			var str = "<section>\n\t\t\t\t<title>" + title + "</title>\n\t\t\t\t<text>\n\t\t\t\t</text>\n\t\t\t</section>";
			var n = ((new DOMParser).parseFromString(str, "text/xml"));
			node.appendChild(n.childNodes[0]);
			
			refreshSectionList("cur", "last");
			refreshSectionList("sel", "first");
		}
		catch(e) {
			alert("新建节失败！");
			return;
		}
		break;
		
	case "chapter":
		title = prompt("请输入新建的章名，取消则放弃新建", "新建章");
		if (!title) {
			return;
		}
		node = getNode("cur", "volume", -1);
		if (!node) {
			return;
		}
		try {
			var str = "<chapter>\n\t\t\t<title>" + title + "</title>\n\t\t</chapter>";
			var n = ((new DOMParser).parseFromString(str, "text/xml"));
			node.appendChild(n.childNodes[0]);
			
			refreshChapterList("cur", "last");
			refreshChapterList("sel", "first");
		}
		catch(e) {
			alert("新建章失败");
			return;
		}
		break;
		
	case "volume":
		title = prompt("请输入新建的卷名，取消则放弃新建", "新建卷");
		if (!title) {
			return;
		}
		node = getNode("cur", "library", -1);
		if (!node) {
			return;
		}
		try {
			var str = "<volume>\n\t\t<title>" + title + "</title>\n\t</volume>";
			var n = ((new DOMParser).parseFromString(str, "text/xml"));
			node.appendChild(n.childNodes[0]);
			
			refreshVolumeList("cur", "last");
			refreshVolumeList("sel", "first");
		}
		catch(e) {
			alert("新建卷失败");
			return;
		}
		break;
		
	case "library":
		if (xmlMain) {
			if (!confirm("当前有已打开的知识库，是否需要保存？\n未保存的知识库将无法找回。")) {
				return;
			}
		}
		title = prompt("请输入新建的知识库名，取消则放弃新建", "新建知识库");
		if (!title) {
			return;
		}
		node = '<?xml version="1.0" encoding="UTF-8" ?>\n<library>\n\t<key>ThatsThePoint</key>\n\t<title>' + title + '</title>\n</library>';
		try {
			var xml = ((new DOMParser()).parseFromString(node, "text/xml"));
			if (!xml) {
				var str = "新建知识库失败";
				if (xmlMain) {
					str += "，当前正在编辑的知识库未受影响";
				}
				alert(str);
				return;
			}
			xmlMain = xml;
		}
		catch(e) {
			alert("新建知识库失败");
			return;
		}

		clearAllSelects("curVolume");
		clearAllSelects("curChapter");
		clearAllSelects("curSection");
		clearAllSelects("selectVolume");
		clearAllSelects("selectChapter");
		clearAllSelects("selectSection");
		
		libName = title;
		fileName = "";
		document.getElementById("curfile").innerHTML = "当前知识库：" + libName;
	}
	
	clearInput();
	initAnchor();
	modify = false;
}

function makeDel()
{
	var node = getNode("cur", "section", -1);
	if (node) {
		if (!confirm("您确认要删除当前节“" + node.getElementsByTagName("title")[0].childNodes[0].nodeValue + "”吗？\n注意：删除后的节不可恢复！")) {
			return;
		}
		
		node.parentElement.removeChild(node);
		refreshSectionList("cur", "first");
		refreshSectionList("sel", "first");
		
		clearInput();
		return;
	}
	
	node = getNode("cur", "chapter", -1);
	if (node) {
		if (!confirm("您确认要删除当前章“" + node.getElementsByTagName("title")[0].childNodes[0].nodeValue + "”吗？\n注意：删除后的章不可恢复！")) {
			return;
		}
		
		node.parentElement.removeChild(node);
		refreshChapterList("cur", "first");
		refreshChapterList("sel", "first");
		
		clearInput();
		return;
	}
	
	node = getNode("cur", "volume", -1);
	if (node) {
		if (!confirm("您确认要删除当前卷“" + node.getElementsByTagName("title")[0].childNodes[0].nodeValue + "”吗？\n注意：删除后的卷不可恢复！")) {
			return;
		}
		
		node.parentElement.removeChild(node);
		refreshVolumeList("cur", "first");
		refreshVolumeList("sel", "first");
		
		clearInput();
		return;
	}
	
	alert("无可删除内容！");
}

function delFormat()
{
	let selObj = document.getElementById("showi").contentDocument.getSelection();
	if (!selObj.rangeCount) {
		return;
	}
	let range = selObj.getRangeAt(0);
	if (!range.collapsed) {
		alert("不支持批量清除格式！");
		return;
	}

	let start = range.startContainer.parentNode;
	switch(start.nodeName.toLowerCase())
	{
	case "p":
	case "div":
		{
			let d = createNode("div", start.innerText);
			start.parentNode.insertBefore(d, start);
			start.remove();
		}
		break;

	case "span":
		{
			let t = document.createTextNode(start.innerText);
			start.parentNode.insertBefore(t, start);
			start.remove();
			t.parentNode.normalize();
		}
		break;

	default:
		alert("意外的删除项！" + start.nodeName);
		break;
	}
}

function getNewistContent()
{
	if (document.getElementById("original").checked) {
		return document.getElementById("origin").value;
	}
	else {
		return document.getElementById("showi").contentDocument.body.innerHTML;
	}
}

function gotoSection()
{
	if (!xmlMain) {
		return;
	}
	
	var vs = document.getElementById("curVolume");
	var cs = document.getElementById("curChapter");
	var ss = document.getElementById("curSection");

	if (vs.selectedIndex == lastVolume && cs.selectedIndex == lastChapter && ss.selectedIndex == lastSection) {
		return;
	}
	
	if (modify) {
		if (!confirm("当前文档尚未保存，您确认要放弃您的编辑吗？")) {
			vs.selectedIndex = lastVolume;
			refreshChapterList("cur", "first");
			cs.selectedIndex = lastChapter;
			refreshSectionList("cur", "first");
			ss.selectedIndex = lastSection;
			return;
		}
		if (!confirm("再确认一次，您确认要放弃您的编辑吗？\n放弃后的编辑内容无法找回！")) {
			vs.selectedIndex = lastVolume;
			refreshChapterList("cur", "first");
			cs.selectedIndex = lastChapter;
			refreshSectionList("cur", "first");
			ss.selectedIndex = lastSection;
			return;
		}
	}
	
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		alert("打开失败，无当前对应节");
		return;
	}
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	if (c.length <= 0) {
		alert("打开失败，无当前对应节");
		return;
	}
	var s = c[cs.selectedIndex].getElementsByTagName("section");
	if (s.length <= 0) {
		alert("打开失败，无当前对应节");
		return;
	}

	lastVolume = vs.selectedIndex;
	lastChapter = cs.selectedIndex;
	lastSection = ss.selectedIndex;
	
	var str = s[ss.selectedIndex].getElementsByTagName("text")[0].innerHTML;
	str = str.replace(/^\s+|\s+$/gm, "");
	str = str.replaceAll("&amp;", "&");
	
	document.getElementById("showi").contentDocument.body.innerHTML = str;
	document.getElementById("showi").contentDocument.body.scrollTop = 0;
	editScroll = 0;
	document.getElementById("origin").value = str;
	
	switching = true;
	modify = false;
	initAnchor();

	undoList.splice(0);
	undoIndex = -1;
}

function save()
{
	if (!xmlMain) {
		return;
	}
	
	var vs = document.getElementById("curVolume");
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		alert("无法定位到节，请新建卷、章、节后保存！");
		return;
	}
	var cs = document.getElementById("curChapter");
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	if (c.length <= 0) {
		alert("无法定位到节，请新建章、节后保存！");
		return;
	}
	var ss = document.getElementById("curSection");
	var s = c[cs.selectedIndex].getElementsByTagName("section");
	if (s.length <= 0) {
		alert("无法定位到节，请新建节后保存！");
		return;
	}
	var t = s[ss.selectedIndex].getElementsByTagName("text")[0];
	
	try {
		let str = getNewistContent();
		let match = str.match(/<img[\s\S]*?>/gi);
		if (match) {
			for (const a of match) {
				str = str.replace(a, a + "</img>");
			}
		}
		str = str.replaceAll("<hr>", "<hr/>");
		str = str.replaceAll("<br>", "<br/>");
		str = str.replaceAll("&", "&amp;");
		t.innerHTML = makeReadableContent(str);
		modify = false;
		alert("保存成功！");
	}
	catch(e) {
		alert("您要保存的内容结构不完整，请检查，或手动进行添加");
	}
	
	initAnchor();
}

function makeSource()
{
	if (!xmlMain) {
		return null;
	}
	
	var str = (new XMLSerializer()).serializeToString(xmlMain);
	str = str.replace(/><library>/g, ">\n<library>");
	str = str.replace(/><\/library>/g, ">\n</library>");
	str = str.replace(/(?<=\n|^)<volume>.*(?=\n|$)/g, "\t<volume>");
	str = str.replace(/(?<=\n|^)\t{0,1}<chapter>.*(?=\n|$)/g, "\t\t<chapter>");
	str = str.replace(/(?<=\n|^)\t{0,2}<section>.*(?=\n|$)/g, "\t\t\t<section>");
	str = str.replace(/><section>/g, ">\n\t\t\t<section>");
	str = str.replace(/><chapter>/g, ">\n\t\t<chapter>");
	str = str.replace(/><volume>/g, ">\n\t<volume>");
	str = str.replace(/><\/section>/g, ">\n\t\t\t</section>");
	str = str.replace(/><\/chapter>/g, ">\n\t\t</chapter>");
	str = str.replace(/><\/volume>/g, ">\n\t</volume>");
	str = str.replace(/<text></g, "<text>\n<");
	str = str.replace(/><\/text>/g, ">\n\t\t\t\t</text>");
	
	return str;
}

function checkRadio(name)
{
	for (let r of document.getElementsByName(name)) {
		if (r && r.checked) {
			return r.id;
		}
	}
	return null;
}

function moveAllChilds(n, s)
{
	let a = s.firstChild, b;
	while(a) {
		b = a.nextSibling;
		n.appendChild(a);
		a = b;
	}
}

function add(e, type)
{
	let edit = document.getElementById("showi").contentDocument;
	let selObj = edit.getSelection();
	if (!selObj.rangeCount) {
		return;
	}
	let range = selObj.getRangeAt(0);

	addUndo();
	if (type == "para") {
		let start = getParentBlock(range.startContainer), end = getParentBlock(range.endContainer);
		// 没有任何内容，直接返回
		if (start == edit.body) {
			return;
		}
		while(start) {
			if (start.nodeName == "p") {
				if (start == end) {
					break;
				}
				start = start.nextSibling;
				continue;
			}

			let p = document.createElement("p");
			let style = "";
			if (document.getElementById("intend").checked) {
				style += "text-indent:2em;";
			}
			if (document.getElementById("parabold").checked) {
				style += "font-weight:bold";
			}
			if (document.getElementById("paracenter").checked) {
				style += "text-align:center";
			}
			p.setAttribute("style", style);
			
			if (document.getElementById("paralist").checked) {
				let u = document.createElement("ul");
				let l = document.createElement("li");
				p.appendChild(u);
				u.appendChild(l);
				moveAllChilds(l, start);
			}
			else {
				moveAllChilds(p, start);
			}
			start.replaceWith(p);

			if (start == end) {
				break;
			}
			start = p.nextSibling;
			while(start.nodeType == Node.TEXT_NODE) {
				p = start.nextSibling;
				start.remove();
				start = p;
			}
		}
		start.remove();
	}
	else if (type == "key") {
		if (range.collapsed) {
			return;
		}
		let span = document.createElement("span");
		try {
			range.surroundContents(span);
		} catch (error) {
			window.alert("请不要跨段落添加重点！");
		}

		let style = "";
		switch(checkRadio("color"))
		{
		case "red":
			style += "color:#FF0000;font-weight:bold;";
			break;

		case "green":
			style += "color:#008000;font-weight:bold;";
			break;
			
		case "yellow":
			style += "color:#FFD700;font-weight:bold;";
			break;
			
		case "blue":
			style += "color:#0000FF;font-weight:bold;";
			break;

		case "bold":
			style += "font-weight:bold;";
			break;
		}
		switch(checkRadio("line"))
		{
		case "straight":
			style += "text-decoration:underline;text-decoration-style:solid;";
			break;
			
		case "wavy":
			style += "text-decoration:underline;text-decoration-style:wavy;";
			break;
			
		case "double":
			style += "text-decoration:underline;text-decoration-style:double;";
			break;
			
		case "through":
			style += "text-decoration:line-through;";
			break;
		}
		span.setAttribute("style", style);

		range.setStart(span.firstChild, span.firstChild.length);
		range.collapse(true);
	}
	else if (type == "mark") {
		let start = getParentBlock(range.startContainer), end = getParentBlock(range.endContainer);
		if (start == edit.body) {
			return;
		}

		let d = document.createElement("div");
		d.setAttribute("class", "ttp_mark");
		start.parentNode.insertBefore(d, start);
		while(start) {
			let p = start.nextSibling;
			let e = document.createElement("div");
			e.setAttribute("style", "text-indent:2em;");
			moveAllChilds(e, start);
			d.appendChild(e);
			if (start == end) {
				break;
			}
			start.remove();
			start = p;
			while(start.nodeType == Node.TEXT_NODE) {
				p = start.nextSibling;
				start.remove();
				start = p;
			}
		}
		start.remove();
	}
	else if (type == "anchor") {
		let start = range.startContainer.parentNode;
		if (start.nodeName.toLowerCase() != "p") {
			alert("只能在段落中添加锚点！");
			return;
		}
		let attr = start.getAttribute("anchor");
		if (attr) {
			alert("请勿重复添加锚点！");
			return;
		}
		start.setAttribute("anchor", getAnchor());
		modify = true;
	}
	else if (type == "quote") {
		if (range.collapsed) {
			return;
		}
		let str = document.getElementById("quote").value;
		if (!str || !str.length) {
			return;
		}

		let span = document.createElement("span");
		try {
			range.surroundContents(span);
		} catch (error) {
			window.alert("请不要跨段落添加重点！");
		}

		span.setAttribute("class", "ttp_jumpto");
		span.setAttribute("onclick", "quote('" + str + "')");

		range.setStart(span.firstChild, span.firstChild.length);
		range.collapse(true);
	}
	else if (type == "table") {
		let t = document.createElement("table");
		t.setAttribute("class", "ttp_table");
		let b = document.createElement("tbody");
		t.appendChild(b);

		let r = parseInt(document.getElementById("tablerow").value);
		if (r !== r) {
			r = 2;
		}
		let c = parseInt(document.getElementById("tablecolume").value);
		if (c !== c) {
			c = 2;
		}
		let j = 0;
		if (document.getElementById("tablehead").checked) {
			let tr = document.createElement("tr");
			if (document.getElementById("horizon").checked) {
				for (let i = 0; i < c; i++) {
					let tb = document.createElement("th");
					tb.setAttribute("class", "ttp_table");
					tb.appendChild(document.createTextNode("1," + (i + 1)));
					tr.appendChild(tb);
				}
			}
			else {
				let tb = document.createElement("th");
				tb.setAttribute("class", "ttp_table");
				tb.appendChild(document.createTextNode("1,1"));
				tr.appendChild(tb);
				for (let i = 1; i < c; i++) {
					let tb = document.createElement("td");
					tb.setAttribute("class", "ttp_table");
					tb.appendChild(document.createTextNode("1," + (i + 1)));
					tr.appendChild(tb);
				}
			}
			b.appendChild(tr);
			j++;
		}
		for (;j < r; j++) {
			let tr = document.createElement("tr");
			let tb;
			for (let i = 0; i < c; i++) {
				if (document.getElementById("tablehead").checked && document.getElementById("vertical").checked && i == 0) {
					tb = document.createElement("th")
				}
				else {
					tb = document.createElement("td");
				}
				tb.setAttribute("class", "ttp_table");
				tb.appendChild(document.createTextNode((j + 1) + "," + (i + 1)));
				tr.appendChild(tb);
			}
			b.appendChild(tr);
		}
		
		if (range.startContainer == edit.body) {
			edit.body.appendChild(t);
		}
		else {
			let e = getParentBlock(range.startContainer);
			e.parentNode.insertBefore(t, e.nextSibling);
		}
	}
}

function makeReadableContent(s)
{
	let a = s;
	a = a.replaceAll("</p><p", "</p>\n<p");
	a = a.replaceAll("</div><div", "</div>\n<div");
	a = a.replaceAll("</p><div", "</p>\n<div");
	a = a.replaceAll("</div><p", "</div>\n<p");
	a = a.replaceAll("><table", ">\n<table");
	a = a.replaceAll("<tbody><", "<tbody>\n<");
	a = a.replaceAll("</tr><", "</tr>\n<");
	a = a.replaceAll("</table><", "</table>\n<")

	return a;
}

function showOriginal(e)
{
	switching = true;
	let s = document.getElementById("showi"), o = document.getElementById("origin");
	if (e.checked) {
		editScroll = s.contentDocument.body.scrollTop;
		s.style.display = "none";
		o.value = makeReadableContent(s.contentDocument.body.innerHTML);
		o.style.display = "";
	}
	else {
		let a = o.value;
		a = a.replaceAll("\n", "");
		a = a.replaceAll("\r", "");
		s.contentDocument.body.innerHTML = a;
		s.style.display = "";
		s.contentDocument.body.scrollTop = editScroll;
		o.style.display = "none";
	}
}

function openCheckWindow()
{
	if (!xmlMain) {
		return;
	}
	
	var str = "<tr><th class='signal'>段落号</th><th class='signal'>锚点号</th><th class='signal'>内容</th></tr>";
	var findAnchor = false;
	
	var vs = document.getElementById("selectVolume");
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		return;
	}
	var cs = document.getElementById("selectChapter");
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	if (c.length <= 0) {
		return;
	}
	var ss = document.getElementById("selectSection");
	var s = c[cs.selectedIndex].getElementsByTagName("section");
	if (s.length <= 0) {
		return;
	}
	var p = s[ss.selectedIndex].getElementsByTagName("text")[0].getElementsByTagName("p");
	
	var idx = vs.selectedIndex + "," + cs.selectedIndex + "," + ss.selectedIndex;
	for (var i = 0; i < p.length; i++) {
		var a = p[i].getAttribute("anchor");
		if (!a) {
			str += ("<tr><td class='signal'>" + i + "</td><td class='signal'>-</td><td class='check'>" + p[i].outerHTML + "</td></tr>");
			continue;
		}
		a = parseInt(a);
		if (a !== a) {
			str += ("<tr><td class='signal'>" + i + "</td><td class='signal'>-</td><td class='check'>" + p[i].outerHTML + "</td></tr>");
		}
		else {
			findAnchor = true;
			str += ("<tr class='alt'><td class='signal' style='font-weight:bold;'>" + i + "</td><td class='signal' style='font-weight:bold;'>" + a + "</td><td class='check' onclick='checkClick(" + '"' + idx + "," + a + '")' + "'>" + p[i].outerHTML + "</td></tr>");
		}
	}
	
	if (!findAnchor) {
		alert("在当前节未找到锚点，请手动添加后再进行引用！");
		return;
	}
	
	setTableInnerHTML(document.getElementById("checktable"), str);
	
	document.getElementById("check").style.display = "";
	
	var an = document.getElementsByClassName("alt")[0];
	var t = document.getElementsByClassName("ttp_checkin")[0];
	t.scrollTop = an.offsetTop - t.offsetHeight * 0.5;
}

function checkClick(str)
{
	switch(str)
	{
	case "close":
		break;
		
	default:
		document.getElementById("quote").value = str;
	}
	document.getElementById("check").style.display = "none";
}

function initAnchor()
{
	let a = 0;
	let t = getNewistContent();
	for (; a < 1000; a++) {
		var i = 'anchor="' + a + '"';
		if (t.indexOf(i) < 0) {
			break;
		}
	}
	
	document.getElementById("anchor").value = a;
	document.getElementById("quote").value = "";
}

function getAnchor()
{
	let a = document.getElementById("anchor").value;
	a = parseInt(a);
	if (a !== a) {
		a = 0;
	}
	
	let str = getNewistContent();
	for (; a < 1000; a++) {
		let i = 'anchor="' + a + '"';
		if (str.indexOf(i) < 0) {
			break;
		}
	}
	
	document.getElementById("anchor").value = a + 1;
	return a;
}

function addUndo()
{
	undoIndex++;
	undoList[undoIndex] = getNewistContent();
	if (undoIndex > 20) {
		undoList.splice(0, 1);
		undoIndex--;
	}
}

function undo()
{
	if (undoIndex < 0) {
		undoIndex = -1;
		return;
	}

	document.getElementById("showi").contentDocument.body.innerHTML = undoList[undoIndex];
	document.getElementById("origin").value = undoList[undoIndex];
	undoIndex--;
}