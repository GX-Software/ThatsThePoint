
var fileName = "", libName = "";

function indexNightMode(tip)
{
	nightMode(tip);
	
	if (night)
	{
		document.getElementById("titleicon").src = "img/iconnight.png";
		document.getElementById("night").innerHTML = "正常模式";
	}
	else
	{
		document.getElementById("titleicon").src = "img/icon.png";
		document.getElementById("night").innerHTML = "夜间模式";
	}
}

function initIndex()
{
	indexNightMode(false);
}

function openFile()
{
	document.getElementById("curlib").innerHTML = "当前知识库：未打开";
	
	var selectedFile = document.getElementById('open').files[0];
	if (!selectedFile) {
		alert("未打开知识库文件！");
		return;
	}
	
	fileName = selectedFile.name;

	var reader = new FileReader();
	reader.readAsText(selectedFile);
	reader.onload = function(evt) {
		var i = evt.target.result.indexOf("<?xml");
		if (i < 0) {
			alert("知识库格式可能已被破坏，无法打开！");
			return;
		}
		var t = evt.target.result.substr(i);
		
		self.parent.global.xmlMain = (new DOMParser()).parseFromString(t, "text/xml");
		if (!self.parent.global.xmlMain) {
			alert("知识库格式可能已被破坏，无法打开！");
			return;
		}
		if (getXMLMain().getElementsByTagName("key")[0].childNodes[0].nodeValue != "ThatsThePoint") {
			alert("此文件非本页面支持的知识库文件，无法打开！");
			return;
		}
		libName = getXMLMain().getElementsByTagName("title")[0].childNodes[0].nodeValue;
		
		document.getElementById("curlib").innerHTML = "当前知识库：" + libName;
		
		var o = document.getElementById('open');
		o.outerHTML = o.outerHTML;
	}
}

function checkOpenLib()
{
	if (getXMLMain() || libName)
	{
		if (confirm("当前已打开题库《" + libName + "》，确认打开新题库？")) {
			return;
		}
		
		if(window.event)
		{
			window.event.returnValue = false;
		}
		else
		{
			e.preventDefault();
		}
	}
}

function setBtnHref(url)
{
	if (!getXMLMain())
	{
		alert("请先打开题库");
		return;
	}
	
	location.href = url;
}

function startMake(url)
{
	if("ontouchstart" in window) {
		alert("请不要在移动端打开本页面！");
	}
	else {
		location.href = url;
	}
}

window.onpageshow = function(event)
{
	if (event.persisted) {
		window.location.reload();
		// 尝试解决Safari回滚后不能回到顶端的问题（不一定能解决）
		window.scrollTo(0, 0);
	}

	if (getXMLMain()) {
		libName = getXMLMain().getElementsByTagName("title")[0].childNodes[0].nodeValue;
		document.getElementById("curlib").innerHTML = "当前题库：" + libName;
	}
}
