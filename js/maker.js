
var undoList = new Array;
var undoArray = -1;

var xmlMain; // 读入的题库转换为DOM
var fileName, libName; // 读入的题库文件名及题库名
var lastStr; // 暂存最近的文字
var modify = false;

window.onbeforeunload = function(e)
{
	return "no";
}

function initMake()
{
	var DEFAULT_VERSION = 8.0;
	var ua = navigator.userAgent.toLowerCase();
	var isIE = ua.indexOf("msie") > -1;
	var safariVersion;
	if(isIE) {
		safariVersion =  ua.match(/msie ([\d.]+)/)[1];
	}
	if(safariVersion <= DEFAULT_VERSION ) {
		window.write("您使用的为IE8.0及更旧版本，请升级浏览器后使用!");
		return;
	};
}

function range(s, e)
{
	this.s = s;
	this.e = e;
}

function openFile()
{
	document.getElementById("curfile").innerHTML = "当前题库：未打开";
	
	// 获取读取我文件的File对象
	var selectedFile = document.getElementById('open').files[0];
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

	var reader = new FileReader(); // 这是核心,读取操作就是由它完成.
	reader.readAsText(selectedFile);
	reader.onload = function(evt) {
		var i = evt.target.result.indexOf("<?xml");
		if (i < 0) {
			alert("题库格式可能已被破坏，无法打开！");
			return;
		}
		var t = evt.target.result.substr(i);

		// 暂时不支持从零开始创建
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
		var test = document.getElementById('open');
		test.outerHTML = test.outerHTML;
		
		document.getElementById("curfile").innerHTML = "当前题库：" + libName;
		
		clearInput();
	}
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
	document.getElementById("input").value = "";
	showTest();
	
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
	var s = document.getElementById(id);
	if (!s) {
		return;
	}
	for (var i = s.length - 1; i >= 0; i--) {
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
			if (!confirm("当前有已打开的知识库，是否需要保存？\n未保存的题库将无法找回。")) {
				return;
			}
		}
		title = prompt("请输入新建的知识库名，取消则放弃新建", "新建题库");
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
		
		libName = title;
		fileName = "";
		document.getElementById("curfile").innerHTML = "当前题库：" + libName;
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

function beginEdit(lock)
{
	if (lock) {
		document.getElementById("unlock").style.display = "none";
		document.getElementsByTagName("body")[0].style.overflow = "hidden";
	}
	else {
		document.getElementById("unlock").style.display = "";
		document.getElementsByTagName("body")[0].style.overflow = "";
	}
}

function gotoSection()
{
	if (!xmlMain) {
		return;
	}
	
	if (modify) {
		if (!confirm("当前文档尚未保存，您确认要放弃您的编辑吗？")) {
			return;
		}
		if (!confirm("再确认一次，您确认要放弃您的编辑吗？\n放弃后的编辑内容无法找回！")) {
			return;
		}
	}
	
	var vs = document.getElementById("curVolume");
	var v = xmlMain.getElementsByTagName("volume");
	if (v.length <= 0) {
		alert("打开失败，无当前对应节");
		return;
	}
	var cs = document.getElementById("curChapter");
	var c = v[vs.selectedIndex].getElementsByTagName("chapter");
	if (c.length <= 0) {
		alert("打开失败，无当前对应节");
		return;
	}
	var ss = document.getElementById("curSection");
	var s = c[cs.selectedIndex].getElementsByTagName("section");
	if (s.length <= 0) {
		alert("打开失败，无当前对应节");
		return;
	}
	
	var str = s[ss.selectedIndex].getElementsByTagName("text")[0].innerHTML;
	str = str.replace(/^\s+|\s+$/gm, "");
	
	var input = document.getElementById("input");
	input.value = str;
	input.scrollTop = 0;
	document.getElementById("show").scrollTop = 0;
	
	modify = false;
	initAnchor();
	showTest();
}

function changeText()
{
	modify = true;
}

function save()
{
	beginEdit(false);
	
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
		t.innerHTML = document.getElementById("input").value;
		modify = false;
		alert("保存成功！");
	}
	catch(e) {
		alert("您要保存的内容结构不完整，请检查，或手动进行添加");
	}
	
	initAnchor();
	showTest();
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

function textSelect(s, e)
{
	var t = document.getElementById("input");
	if (t.setSelectionRange) {
		t.setSelectionRange(s, e);	
	}
	else if (t.createTextRange) {
		var rang = t.createTextRange();
		rang.collapse(true);
		rang.moveStart('character', start);
		rang.moveEnd('character', end - start);
		rang.select();	
	}
	t.focus();
}

function getSelectedText()
{
	var t = document.getElementById("input");
	if (window.getSelection) {
		if (t.selectionStart != undefined && t.selectionEnd != undefined) {
			return new range(t.selectionStart, t.selectionEnd);
		}
		else {
			return null;
		}
	}
	else {
		var s = t.value.indexOf(document.selection.createRange().text);
		return new range(s, s + document.selection.createRange().text.length);
	}
}

function add(type)
{
	var r = getSelectedText();
	if (!r || r.s >= r.e) {
		return;
	}
	
	changeText();
	
	var t = document.getElementById("input");
	addUndo(t.value);
	
	var start = "", end = "", style = "";
	switch(type)
	{
	case "para":
		{
			if (document.getElementById("paralist").checked) {
				end = "</li></ul></p>";
			}
			else {
				end = "</p>";
			}
			if (!document.getElementById("paralist").checked) {
				if (document.getElementById("intend").checked) {
					style += "text-indent:2em;";
				}
				if (document.getElementById("parabold").checked) {
					style += "font-weight:bold;";
				}
				if (document.getElementById("paracenter").checked) {
					style += "text-align:center;";
				}
			}
			start = "<p";
			if (style.length) {
				start += ' style="' + style + '"';
			}
			
			var anchorstart = start;
			if (document.getElementById("addanchor").checked) {
				anchorstart += getAnchor();
			}
			start += ">";
			if (document.getElementById("paralist").checked) {
				start += "<ul><li>";
			}
			anchorstart += ">";
			if (document.getElementById("paralist").checked) {
				anchorstart += "<ul><li>";
			}
			
			var returnList = new Array();
			for (var i = r.s; i < r.e; i++) {
				switch(t.value.charAt(i))
				{
				case "\r":
					if (i + 1 < t.value.length && t.value.charAt(i + 1) == "\n") {
						returnList.push(new range(i, i + 2));
						i++;
					}
					else if (i < t.value.length) {
						returnList.push(new range(i, i + 1));
					}
					break;
					
				case "\n":
					if (i + 1 < t.value.length && t.value.charAt(i + 1) == "\r") {
						returnList.push(new range(i, i + 2));
						i++;
					}
					else if (i < t.value.length) {
						returnList.push(new range(i, i + 1));
					}
					break;
				}
			}
			
			t.setRangeText(end, r.e, r.e);
			for (var i = returnList.length - 1; i >= 0; i--) {
				t.setRangeText(end + "\r" + start, returnList[i].s, returnList[i].e);
			}
			
			// 多个段落添加锚点时，只有第一个段落有锚点。
			if (document.getElementById("addanchor").checked) {
				t.setRangeText(anchorstart, r.s, r.s);
			}
			else {
				t.setRangeText(start, r.s, r.s);
			}
			
			// 添加锚点后自动取消选中
			document.getElementById("addanchor").checked = false;
		}
		showTest();
		return;
		
	case "key":
		end = "</span>";
		if (document.getElementById("addcolor").checked) {
			style += "color:";
			switch(getRadioValue("color"))
			{
			case 0:
				style += "#FF0000;";
				break;
				
			case 1:
				style += "#008000;";
				break;
				
			case 2:
				style += "#FFD700;";
				break;
				
			case 3:
				style += "#0000FF;";
				break;
				
			case 4:
				style += "#000;";
				break;
			}
			style += "font-weight:bold;";
		}
		if (document.getElementById("addline").checked) {
			switch(getRadioValue("line"))
			{
			case 0:
				style += "text-decoration:underline;text-decoration-style:solid;";
				break;
				
			case 1:
				style += "text-decoration:underline;text-decoration-style:wavy;";
				break;
				
			case 2:
				style += "text-decoration:underline;text-decoration-style:double;";
				break;
				
			case 3:
				style += "text-decoration:line-through;";
				break;
			}
		}
		start = "<span";
		if (style.length) {
			start += ' style="' + style + '"';
		}
		else {
			return;
		}
		start += ">";
		break;
		
	case "mark":
		end = "</p>";
		start = '<p class="ttp_mark">';
		break;
		
	case "sup":
		end = '</sup>';
		start = '<sup>';
		break;
		
	case "sub":
		end = '</sub>';
		start = '<sub>';
		break;
		
	case "quote":
		{
			var str = document.getElementById("quote").value;
			if (!str || !str.length) {
				return;
			}
			
			end = "</span>";
			start = '<span class="ttp_jumpto" onclick="quote(' + "'" + str + "'" + ')">';
		}
		break;
	}
	
	t.setRangeText(end, r.e, r.e);
	t.setRangeText(start, r.s, r.s);
	showTest();
}

function showSignal(show)
{
	document.getElementById("signal").style.display = show ? "" : "none";
}

function getRadioValue(name)
{
	var l = document.getElementsByName(name);
	for (var i = 0; i < l.length; i++) {
		if (l[i].checked) {
			return i;
		}
	}
	
	return -1;
}

function showTest()
{
	document.getElementById("show").innerHTML = document.getElementById("input").value;
}

function addUndo(str)
{
	undoArray++;
	undoList[undoArray] = str;
	if (undoList.length > 20) {
		undoList.splice(0, 1);
		undoArray--;
	}
}

function undo()
{
	if (undoArray < 0) {
		undoArray = -1;
		return;
	}
	
	document.getElementById("input").value = undoList[undoArray];
	undoArray--;
	showTest();
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

function quote(str)
{
	// 防止点击内容中的链接
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
	var a = 0;
	for (; a < 1000; a++) {
		var i = 'anchor="' + a + '"';
		if (document.getElementById("input").value.indexOf(i) < 0) {
			break;
		}
	}
	
	document.getElementById("anchor").value = a;
	document.getElementById("quote").value = "";
}

function getAnchor()
{
	var a = document.getElementById("anchor").value;
	a = parseInt(a);
	if (a !== a) {
		a = 0;
	}
	
	var str = document.getElementById("input").value;
	for (; a < 1000; a++) {
		var i = 'anchor="' + a + '"';
		if (str.indexOf(i) < 0) {
			break;
		}
	}
	
	document.getElementById("anchor").value = a + 1;
	return (' anchor="' + a + '"');
}

function fix()
{
	var s = document.getElementById("show");
	var p = s.getElementsByTagName("p");
	if (!p || !p.length) {
		return;
	}
	
	var i;
	for (i = 0; i < p.length; i++) {
		if (p[i].offsetTop - p[0].offsetTop >= s.scrollTop) {
			break;
		}
	}
	
	var c = document.getElementById("input");
	var start = c.value.indexOf(p[i].outerHTML);
	if (start < 0) {
		return;
	}
	var end = start + p[i].outerHTML.length;
	
	if(c.setSelectionRange)
	{
		var fullText = c.value;
		c.value = fullText.substring(0, end);
		var scrollHeight = c.scrollHeight;
		c.value = fullText;
		
		var scrollTop = scrollHeight;
		if (scrollTop > c.clientHeight){
			scrollTop -= c.clientHeight * 0.1;
		}
		else {
			scrollTop = 0;
		}
		c.scrollTop = scrollTop;
		c.setSelectionRange(start, end);
		c.focus();
	}
}