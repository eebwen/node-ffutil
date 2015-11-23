'use strict';

var fs = require('fs');
var util = require('util');
var Thenjs = require('thenjs');
var exec = require('child_process').exec;

var debuglog = util.debuglog('ffutil');

var ffutil = {};

ffutil.videoInfo = function (inputStream, callback) {
	var ffprobe = util.format('ffprobe -analyzeduration 100000000 -probesize 9999999 -of json -show_streams -select_streams v -show_format %s', inputStream);
	debuglog(ffprobe);
	exec(ffprobe, function (err, stdout, stderr) {
		if (err) {
			typeof(callback) === 'function' ? callback(err, stderr) : null;
			return;
		}

		try {
			var videoInfo = JSON.parse(stdout);
			typeof(callback) === 'function' ? callback(null, videoInfo) : null;
		} catch (e) {
			typeof(callback) === 'function' ? callback(err) : null;
		}
	});
};

// duration = [{s: xx, t:ss}]

ffutil.videoClip = function (inputStream, outputDir, durations, callback) {
	Thenjs.eachSeries(durations, function (cont, du) {
		var ffmpeg;
		if (inputStream.match(/\.(m3u8|ts)$/)) {
			ffmpeg = util.format("ffmpeg -analyzeduration 100000000 -probesize 9999999 -ss %d -i %s -t %d -bsf:a aac_adtstoasc -c copy -y -f mp4 %s -loglevel quiet", du.s, inputStream, du.t, outputDir + '/tmp_' + du.s + '.mp4');
		} else {
			ffmpeg = util.format("ffmpeg -analyzeduration 100000000 -probesize 9999999 -ss %d -i %s -t %d -c copy -y -f mp4 %s -loglevel quiet", du.s, inputStream, du.t, outputDir + '/tmp_' + du.s + '.mp4');
		}
		
		debuglog(ffmpeg);
		exec(ffmpeg, cont);
	})
	.then(function (cont) {
		callback(null);
	})
	.fail(function (cont, err) {
		callback(err);
	});
}

fftool.file2Ts = function (inputUrl, dstdir, filename, callback) {
	var ffmpeg;
	var m3u8Path = path.join(dstdir, filename + '.m3u8');
	var tsFilePath = path.join(dstdir, filename + '_%05.ts');
	if (inputUrl.match(/\.(m3u8|ts)$/)) {
		ffmpeg = util.format("ffmpeg -analyzeduration 999999999 -probesize 999999999 -i %s -c copy -y -f segment -segment_list %s -segment_time 10 %s -loglevel quiet", inputUrl, m3u8Path, tsFilePath);
	} else {
		ffmpeg = util.format("ffmpeg -analyzeduration 999999999 -probesize 999999999 -i %s -c copy -map 0 -vbsf h264_mp4toannexb -y -f segment -segment_list %s -segment_time 10 %s -loglevel quiet", inputUrl, dstdir, tsName, m3u8Path, tsFilePath);
	}

	debuglog(ffmpeg);
	exec(ffmpeg, typeof(callback) === 'function' ? callback : null);
}

ffutil.concatFile = function (inputDir, dstFile, callback) {
	var concatFile = inputDir + '/concatfile';
	Thenjs(function (cont) {
		fs.readdir(inputDir, cont);
	})
	.then(function (cont, files) {
		var str = null;
		files.map(function (file) {
			debuglog({
				file : file
			});
			if (file.match(/\.mp4$/)) {
				str += 'file ' + file + '\n';
			}
		});
		debuglog({
			concatFile : concatFile,
			str : str
		});
		if (str) {
			fs.writeFile(concatFile, str, cont);
		} else {
			cont(new Error('Not find video file.'));
		}
	})
	.then(function (cont) {
		var cmd = util.format("ffmpeg -loglevel quiet -analyzeduration 100000000 -probesize 9999999 -f concat -i %s -c copy -y %s", concatFile, dstFile);
		debuglog(cmd);
		exec(cmd, cont);
	})
	.fin(function (cont, err, result) {
		typeof(callback) === 'function' ? callback(err, result);
	});
}

ffutil.makeThumb = function (inputStream, dstdir, thumbname, videoInfo, callback) {

	var width 	= videoInfo.streams[0].width;
	var height 	= videoInfo.streams[0].height;
	var aspect 	= height / width;

	var minSize 	= '120x' + parseInt(120 * aspect);
	var middleSize 	= '640x' + parseInt(640 * aspect);

	var duration = videoInfo.format.duration;

	var indexs, interval;
	if (duration > 60 * 2) {
		interval = parseInt(duration / 5);
		indexs = [1, 2, 3, 4];
	} else {
		indexs = [1];
		interval = parseInt(duration / 2);
	}

	Thenjs.eachSeries(indexs, function (cont, i) { // 大图
		var cmd = util.format('ffmpeg -analyzeduration 100000000 -probesize 9999999 -ss %d -i %s -r 1 -vframes 1 -y -f image2 %s/%s_%d.jpg -loglevel quiet', interval * i, inputStream, dstdir, thumbname, i);
		debuglog(cmd);
		exec(cmd, cont);
	}, true)
	.eachSeries(indexs, function (cont, i) { // 方形缩略图
		var cmd = util.format("ffmpeg -loglevel quiet -i %s/%s_%d.jpg -vf crop=%d:%d -s 200x200 -y %s/%s_w_%d.jpg", dstdir, thumbname, i, height, height, dstdir, thumbname, i);
		debuglog(cmd);
		exec(cmd, cont);
	})
	.eachSeries(indexs, function (cont, i) { // 中型缩略图
		var cmd = util.format("ffmpeg -loglevel quiet -i %s/%s_%d.jpg -s %s -y %s/%s_m_%d.jpg", dstdir, thumbname, i, middleSize, dstdir, thumbname, i);
		debuglog(cmd);
		exec(cmd, cont);
	})
	.eachSeries(indexs, function (cont, i) { // 小型说略图
		var cmd = util.format("ffmpeg -loglevel quiet -i %s/%s_%d.jpg -s %s -y %s/%s_s_%d.jpg", dstdir, thumbname, i, minSize, dstdir, thumbname, i);
		debuglog(cmd);
		exec(cmd, cont);
	})
	.fin(function (cont, err, result) {
		typeof(callback) === 'function' ? callback(err, result) : null;
	});
}

module.exports = ffutil;
