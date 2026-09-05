const mangayomiSources = [{
    "name": "Anibd.App",
    "id": 829457287,
    "baseUrl": "https://anibd.app",
    "lang": "all",
    "typeSource": "single",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://anibd.app/",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "",
    "apiUrl": "https://eng.animeapps.top/api",
    "version": "1.0.0",
    "isManga": false,
    "itemType": 1,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "",
    "pkgPath": "anime/src/all/anibd.app.js"
}];
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getPreference(key) {
        return new SharedPreferences().get(key);
    }

    getHeaders() {
        return {
            Referer: "https://anibd.app",
            Origin: "https://anibd.app",
            "User-Agent": "MangaYomi"
        };
    }

    async request(slug, hdr) {
        var url = (slug.includes("apilink.php") || slug.includes("api2.php")) ? "https://epeng.animeapps.top" : this.source.apiUrl
        url += slug
        var hdr = this.getHeaders();
        var res = await this.client.get(url, hdr);
        if (res.statusCode != 200) return null;
        return JSON.parse(res.body);
    }

    async filterAnimeList(slug) {
        var list = [];
        var hasNextPage = false;

        var res = await this.request(slug);
        if (res != null) {
            var data = res["data"]

            var pagination = res['pagination']
            var current_page = pagination['current_page']
            var total_pages = pagination['total_pages']
            hasNextPage = total_pages > current_page;

            data.forEach(item => {
                var name = item["postname"]
                var imageUrl = item["ani_cover_medium"]
                var link = "" + item["postid"]
                list.push({ name, imageUrl, link });
            })
        }

        return { list, hasNextPage };
    }

    async getPopular(page) {
        var slug = `/apihistory.php?limit=30&page=${page}`
        return await this.filterAnimeList(slug);
    }

    async getLatestUpdates(page) {
        var slug = `/singlefilter.php?limit=30&page=${page}`
        return await this.filterAnimeList(slug);
    }

    async search(query, page, filters) {
        var slug = `/search3.php?keyword=${query}&limit=30&page=${page}`
        return await this.filterAnimeList(slug);
    }

    async getDetail(url) {
        var linkSlug = `${this.source.baseUrl}/up/`
        var aniId = url;
        if (aniId.includes(linkSlug)) {
            aniId = url.replace(linkSlug, "");
        }
        var slug = `/single.php?postid=${aniId}`
        var res = await this.request(slug);
        if (res != null) {
            var link = linkSlug + aniId;
            var animeDetails = res.data
            var name = animeDetails.postname
            var description = animeDetails.postcontent
            var genre = animeDetails.postanigenres.split(", ")
            var status = animeDetails['postseasontype'].includes("Airing") ? 0 : 5;

            var anilist = animeDetails['anilist']
            var chapters = [];
            slug = `/api2.php?epid=${anilist}`
            res = await this.request(slug);
            if (res != null && res.length > 0) {
                var isMovie = animeDetails['anitypes'].includes("MOVIE")

                var server_data = res[0]['server_data'];
                server_data.forEach(item => {
                    var epName = isMovie ? "Movie" : `Episode ${item['name']}`
                    chapters.push({
                        name: epName,
                        url: item['link'],
                    });
                });
                chapters.reverse();
            }


            return { name, status, description, genre, link, chapters };
        }
    }

    async getVideoList(url) {
        var streams = [];
        var hdr = this.getHeaders();

        var slug = `/apilink.php?data=${url}`
        var res = await this.request(slug);
        if (res != null && res.length > 0) {
            res.forEach(item => {
                var serverName = item['server']
                var embedLink = item['link']
                var linkId = embedLink.split("url=")[1];
                var hasSub = embedLink.includes("playsub.php")
                var cacheCode = hasSub ? "cachesub" : "cachehd"
                var streamLink = `https://playeng.animeapps.top/r2/${cacheCode}/${linkId}/index.m3u8`;
                var subtitles = []
                if (hasSub) {
                    subtitles.push({
                        file: `https://ani10.nukitashi.top/${linkId}/sub.vtt`,
                        label: "English",
                    });
                }
                streams.push(
                    {
                        url: streamLink,
                        originalUrl: streamLink,
                        quality: serverName,
                        headers: hdr,
                        subtitles,
                    }
                )
            });
        }
        return streams;
    }

    getFilterList() {
        throw new Error("getFilterList not implemented");
    }

    getSourcePreferences() {
        throw new Error("getSourcePreferences not implemented");
    }
}