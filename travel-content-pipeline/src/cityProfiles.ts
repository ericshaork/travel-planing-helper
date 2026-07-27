import type { CandidatePoiSeed, CityProfile } from "./types.js";

function buildPoiSeed(
  city: string,
  name: string,
  tags: CandidatePoiSeed["tags"],
  vibeTags: string[],
  descriptionSeed: string,
  recommendedDurationMinutes: number,
): CandidatePoiSeed {
  return {
    city,
    name,
    tags,
    vibeTags,
    descriptionSeed,
    recommendedDurationMinutes,
  };
}

export const CITY_PROFILES: CityProfile[] = [
  {
    city: "厦门",
    aliases: ["厦門", "Xiamen"],
    baseCoordinates: { lng: 118.0894, lat: 24.4798 },
    coreAreas: ["鼓浪屿片区", "沙坡尾片区", "环岛路片区", "中山路片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("厦门", "鼓浪屿", ["sea", "photo", "history", "slow"], ["海岛步行", "建筑感", "慢游氛围"], "适合安排半天到一天的海岛漫游，强调看海、建筑和慢慢逛的节奏。", 240),
      buildPoiSeed("厦门", "沙坡尾", ["sea", "food", "photo", "nightlife"], ["码头街区", "傍晚氛围", "文艺感"], "适合放在下午到傍晚，兼顾街区散步、小吃补给和夜色氛围。", 120),
      buildPoiSeed("厦门", "环岛路", ["sea", "nature", "photo", "slow"], ["滨海路线", "海风", "开放景观"], "适合看海、散步或短距离骑行，适合作为放松型路段。", 120),
      buildPoiSeed("厦门", "中山路步行街", ["food", "shopping", "history", "low_walk"], ["老城商业街", "公共交通方便", "吃逛集中"], "适合把城市观察、补给和餐饮放在同一段时间内完成。", 120),
      buildPoiSeed("厦门", "八市", ["food", "history"], ["市场烟火气", "早餐友好", "本地感"], "适合安排在早餐或午市前后，补充本地市场氛围和小吃密度。", 75),
      buildPoiSeed("厦门", "曾厝垵", ["food", "photo", "shopping"], ["街巷游逛", "轻松补给", "夜间可停留"], "适合轻松走逛、补给和拍照，适配预算灵活的休闲段落。", 90),
    ],
    foodKeywords: ["海鲜小吃", "市场档口", "老街小吃", "花生汤", "沙茶风味"],
    photoKeywords: ["海边步道", "码头街景", "建筑立面", "傍晚海风", "街巷灯光"],
    historyKeywords: ["老城街区", "近代建筑", "港口记忆", "闽南文化"],
    natureKeywords: ["海岸线", "滨海步道", "城市绿地", "轻松看海"],
    seaKeywords: ["海岛", "码头", "沙滩", "滨海骑行"],
    transitNotes: ["优先用地铁、公交和步行串联中山路与沙坡尾片区。", "岛内与岛外转场要避免频繁折返。"],
    budgetNotes: ["低预算可优先安排市场小吃、城市漫步和公共交通可达片区。", "热门海边点位在假期可能带来额外交通与排队成本。"],
    avoidNotes: ["避免同一天安排过多跨海或跨区移动。", "旺季海边片区体感较热，需保留机动时间。"],
  },
  {
    city: "成都",
    aliases: ["Chengdu", "成都城"],
    baseCoordinates: { lng: 104.0665, lat: 30.5728 },
    coreAreas: ["宽窄巷子片区", "春熙路片区", "望平坊片区", "武侯祠片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("成都", "宽窄巷子", ["food", "history", "photo"], ["街巷漫游", "城市名片", "适合慢逛"], "适合用来感受城市街巷氛围和拍照节奏，可作为首站。", 120),
      buildPoiSeed("成都", "人民公园", ["nature", "slow", "low_walk"], ["喝茶氛围", "本地休闲", "步行友好"], "适合把节奏放慢，体验城市休闲方式和短暂停留。", 90),
      buildPoiSeed("成都", "锦里", ["food", "history", "photo", "nightlife"], ["夜间灯光", "街区游逛", "氛围浓度高"], "适合下午后段到夜间安排，兼顾街景和餐饮选择。", 120),
      buildPoiSeed("成都", "武侯祠博物馆片区", ["history", "museum", "low_walk"], ["文化向", "室内外结合", "信息密度高"], "适合文化主题路线，补充成都历史脉络。", 120),
      buildPoiSeed("成都", "建设路小吃片区", ["food", "nightlife"], ["小吃密集", "预算友好", "夜间活跃"], "适合学生和朋友结伴，强调低预算补给和夜间烟火气。", 90),
      buildPoiSeed("成都", "望平坊沿河步行段", ["food", "photo", "slow"], ["沿河散步", "傍晚友好", "轻松转场"], "适合傍晚散步和拍照，适合作为一天的收束段。", 90),
    ],
    foodKeywords: ["川味小吃", "串串", "茶馆", "夜宵片区", "烟火街区"],
    photoKeywords: ["沿河夜景", "街巷灯牌", "茶馆氛围", "文化街景"],
    historyKeywords: ["三国文化", "老城街区", "祠庙建筑", "城市记忆"],
    natureKeywords: ["公园喝茶", "城市河道", "绿荫步道"],
    seaKeywords: [],
    transitNotes: ["城区内适合地铁加短步行组合。", "热门片区高峰时段打车效率未必稳定。"],
    budgetNotes: ["低预算更适合小吃片区、城市公园和步行串联。", "餐饮选择很多，但热门店排队会抬高时间成本。"],
    avoidNotes: ["避免同一天把城西和城东多个热点都塞满。", "夏季中午室外停留过久会压缩晚间体验。"],
  },
  {
    city: "杭州",
    aliases: ["Hangzhou", "杭城"],
    baseCoordinates: { lng: 120.1551, lat: 30.2741 },
    coreAreas: ["西湖片区", "湖滨片区", "南宋御街片区", "运河片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("杭州", "西湖步行段", ["nature", "photo", "slow"], ["湖边散步", "经典景观", "节奏舒缓"], "适合用低强度步行串起杭州的代表性风景。", 150),
      buildPoiSeed("杭州", "湖滨步行街", ["shopping", "photo", "food", "low_walk"], ["城市界面", "吃逛集中", "傍晚友好"], "适合低步行强度的城市游逛和补给。", 120),
      buildPoiSeed("杭州", "南宋御街", ["history", "food", "photo"], ["老街气质", "吃逛结合", "适合轻松停留"], "适合把历史街区、小吃和拍照结合安排。", 90),
      buildPoiSeed("杭州", "中国丝绸博物馆片区", ["museum", "history", "low_walk"], ["室内参观", "文化向", "信息量适中"], "适合文化向和少走路需求，可作为避暑避雨段。", 90),
      buildPoiSeed("杭州", "京杭大运河步行段", ["history", "nature", "slow", "photo"], ["水岸景观", "城市慢游", "适合傍晚"], "适合放慢节奏，观察杭州水岸城市界面。", 120),
      buildPoiSeed("杭州", "龙井周边茶园步行段", ["nature", "photo", "slow"], ["茶园景观", "视野开阔", "适合轻摄影"], "适合偏自然和慢节奏的路线，但要避免安排过密。", 120),
    ],
    foodKeywords: ["茶点", "杭帮小吃", "湖滨餐饮", "街区补给"],
    photoKeywords: ["湖边倒影", "傍晚水岸", "茶园视野", "老街立面"],
    historyKeywords: ["宋韵街区", "博物馆", "运河记忆", "城景演变"],
    natureKeywords: ["西湖", "运河", "茶园", "林荫步道"],
    seaKeywords: [],
    transitNotes: ["西湖周边适合步行加短距离公共交通。", "景区边界较大，需控制一天内转场次数。"],
    budgetNotes: ["低预算更适合步行、博物馆和街区型体验。", "茶园或热门湖景餐饮会拉高预算。"],
    avoidNotes: ["避免把西湖、运河和远郊茶园都压在同一天。", "节假日热门点位步行拥挤度较高。"],
  },
  {
    city: "上海",
    aliases: ["Shanghai", "魔都"],
    baseCoordinates: { lng: 121.4737, lat: 31.2304 },
    coreAreas: ["外滩片区", "武康路片区", "愚园路片区", "豫园片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("上海", "外滩步行段", ["photo", "history", "nightlife"], ["城市天际线", "夜景强", "步行可看"], "适合安排在傍晚或夜间，兼顾城市地标和拍照。", 90),
      buildPoiSeed("上海", "武康路街区", ["photo", "history", "slow"], ["建筑街景", "城市散步", "轻松氛围"], "适合慢慢走逛，强调建筑、街景和生活感。", 120),
      buildPoiSeed("上海", "豫园周边老城片区", ["food", "history", "photo"], ["老城氛围", "吃逛集中", "可作为文化段"], "适合感受老城界面和集中补给。", 120),
      buildPoiSeed("上海", "苏州河步行段", ["photo", "nature", "slow"], ["滨水散步", "城市更新", "傍晚友好"], "适合做轻松段落，减少高强度打卡。", 90),
      buildPoiSeed("上海", "上海博物馆片区", ["museum", "history", "low_walk"], ["室内优先", "文化集中", "适合避暑避雨"], "适合文化向路线和少走路需求。", 120),
      buildPoiSeed("上海", "愚园路街区", ["food", "photo", "slow"], ["轻松咖啡街区", "街景细节", "适合收束一天"], "适合收束型路线，兼顾轻餐饮和城市观察。", 90),
    ],
    foodKeywords: ["本帮风味", "街区轻餐饮", "夜间补给", "老城小吃"],
    photoKeywords: ["天际线", "街区建筑", "滨水夜景", "梧桐街景"],
    historyKeywords: ["老城片区", "博物馆", "近代建筑", "城市更新"],
    natureKeywords: ["滨水步道", "城市绿地", "低强度散步"],
    seaKeywords: ["滨江步道", "码头视角"],
    transitNotes: ["地铁覆盖度高，适合按片区分天。", "跨区切换要留足通勤时间。"],
    budgetNotes: ["低预算时优先街区步行和免费公共空间。", "热门观景位和核心商圈餐饮可能显著抬高预算。"],
    avoidNotes: ["避免同一天横跨浦东浦西多个核心片区。", "夜景安排后不宜再叠加远距离返程。"],
  },
  {
    city: "泉州",
    aliases: ["Quanzhou", "刺桐城"],
    baseCoordinates: { lng: 118.6757, lat: 24.8741 },
    coreAreas: ["西街片区", "开元寺片区", "钟楼片区", "蟳埔片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("泉州", "西街", ["food", "history", "photo", "slow"], ["老街漫游", "吃逛一体", "适合慢游"], "适合把街区漫步、建筑观察和小吃停留集中完成。", 150),
      buildPoiSeed("泉州", "开元寺", ["history", "museum", "slow"], ["宗教建筑", "文化浓度高", "静态参观"], "适合文化主题路线，强调慢看和细节观察。", 90),
      buildPoiSeed("泉州", "泉州海外交通史博物馆", ["history", "museum", "low_walk"], ["室内优先", "避暑避雨", "适合补背景"], "适合补足城市背景理解，适合少走路需求。", 90),
      buildPoiSeed("泉州", "钟楼周边街区", ["history", "food", "photo"], ["城市地标", "老城交汇", "街景采集"], "适合串联打卡、补给和街景观察。", 60),
      buildPoiSeed("泉州", "蟳埔民俗文化村", ["photo", "history", "sea"], ["海边聚落", "民俗氛围", "下午光线友好"], "适合拍照和观察海边生活方式，适合留给下午。", 120),
      buildPoiSeed("泉州", "洛阳桥", ["history", "nature", "photo", "slow"], ["桥梁景观", "慢节奏", "文化自然兼顾"], "适合作为风景与文化兼顾的留白段落。", 75),
    ],
    foodKeywords: ["闽南小吃", "老街点心", "市场烟火", "街区补给"],
    photoKeywords: ["老城屋檐", "宗教建筑", "海边聚落", "桥梁景观"],
    historyKeywords: ["宗教建筑", "海丝记忆", "老城街区", "博物馆"],
    natureKeywords: ["桥边风景", "慢游步段", "开阔视野"],
    seaKeywords: ["海边聚落", "港口记忆", "滨海观察"],
    transitNotes: ["老城核心更适合步行串联。", "蟳埔等外围点位要避免和老城来回折返。"],
    budgetNotes: ["低预算适合老城步行、小吃和博物馆组合。", "外围点位交通切换会增加支出和时间。"],
    avoidNotes: ["避免把老城密集街区和外围海边点位在一天内来回切换。", "文化点多时要控制信息密度。"],
  },
  {
    city: "广州",
    aliases: ["Guangzhou", "羊城"],
    baseCoordinates: { lng: 113.2644, lat: 23.1291 },
    coreAreas: ["永庆坊片区", "北京路片区", "沙面片区", "珠江沿岸片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("广州", "永庆坊", ["food", "history", "photo", "slow"], ["街区更新", "岭南气质", "适合慢逛"], "适合把老城氛围、吃逛和拍照集中安排。", 120),
      buildPoiSeed("广州", "沙面步行段", ["history", "photo", "slow"], ["建筑街景", "轻松步行", "合照友好"], "适合低强度散步和建筑观察。", 90),
      buildPoiSeed("广州", "北京路步行街", ["food", "shopping", "history", "low_walk"], ["吃逛集中", "步行友好", "城市界面强"], "适合把补给、逛街和城市观察组合完成。", 120),
      buildPoiSeed("广州", "珠江沿岸夜景段", ["photo", "nightlife", "slow"], ["夜景", "沿江散步", "傍晚友好"], "适合做傍晚和夜间段落，提升拍照和氛围感。", 90),
      buildPoiSeed("广州", "陈家祠片区", ["history", "museum", "low_walk"], ["文化向", "室内外结合", "细节丰富"], "适合文化主题和少走路需求。", 90),
      buildPoiSeed("广州", "上下九周边街区", ["food", "history", "shopping"], ["老街补给", "烟火气", "适合朋友结伴"], "适合预算友好的吃逛路线。", 120),
    ],
    foodKeywords: ["广式点心", "老城小吃", "糖水", "夜间补给"],
    photoKeywords: ["沿江夜景", "骑楼街景", "岭南建筑", "街区更新"],
    historyKeywords: ["骑楼", "祠堂建筑", "老城记忆", "岭南文化"],
    natureKeywords: ["沿江散步", "城市公园", "树荫步道"],
    seaKeywords: ["江景视角", "码头氛围"],
    transitNotes: ["核心片区适合地铁加步行串联。", "老城区步行密度高，要控制午后体力消耗。"],
    budgetNotes: ["低预算适合步行街、小吃和沿江散步。", "核心商圈餐饮和夜间交通会拉高预算。"],
    avoidNotes: ["避免同一天安排过多跨江切换。", "高温天气下老城区连续暴走体验较差。"],
  },
  {
    city: "深圳",
    aliases: ["Shenzhen", "深城"],
    baseCoordinates: { lng: 114.0579, lat: 22.5431 },
    coreAreas: ["南头古城片区", "深圳湾片区", "华强北片区", "盐田海边片区"],
    recommendedPoiSeeds: [
      buildPoiSeed("深圳", "南头古城", ["history", "food", "photo", "slow"], ["城市旧城", "轻松游逛", "适合慢慢看"], "适合在快节奏城市里安排一段文化和街区慢游。", 120),
      buildPoiSeed("深圳", "深圳湾公园步行段", ["nature", "sea", "photo", "slow"], ["滨海散步", "日落友好", "开放视野"], "适合看海、散步和傍晚拍照。", 120),
      buildPoiSeed("深圳", "华强北街区", ["shopping", "food", "photo"], ["城市感强", "补给密集", "步行片区"], "适合体验城市密度和集中补给。", 90),
      buildPoiSeed("深圳", "较场尾周边海边段", ["sea", "photo", "slow"], ["海边停留", "轻度度假感", "适合放松"], "适合作为海边主题路线的放松段落。", 150),
      buildPoiSeed("深圳", "深圳博物馆片区", ["museum", "history", "low_walk"], ["室内参观", "城市背景", "适合避暑"], "适合文化向和少走路需求。", 90),
      buildPoiSeed("深圳", "人才公园夜景段", ["photo", "nightlife", "nature"], ["夜景灯光", "城市天际线", "步行友好"], "适合作为傍晚收束段，补足夜景内容。", 90),
    ],
    foodKeywords: ["商圈补给", "轻餐饮", "海边简餐", "夜间小吃"],
    photoKeywords: ["海边日落", "城市天际线", "街区灯光", "现代感"],
    historyKeywords: ["古城片区", "城市发展", "博物馆"],
    natureKeywords: ["滨海公园", "城市绿地", "轻松散步"],
    seaKeywords: ["滨海步道", "海边停留", "码头视角"],
    transitNotes: ["地铁覆盖度高，但城市尺度大，需按片区分天。", "海边和城区切换要预留完整转场时间。"],
    budgetNotes: ["低预算更适合公园、古城和商圈步行路线。", "远距离跨区出行会显著增加交通成本。"],
    avoidNotes: ["避免把海边远端点位和市中心点位塞在同一天。", "城市跨度大时，一天内超过四个点会明显赶路。"],
  },
];

export function getCityProfile(cityName: string): CityProfile | undefined {
  const normalized = cityName.trim().toLowerCase();

  return CITY_PROFILES.find((profile) => {
    if (profile.city.toLowerCase() === normalized) {
      return true;
    }

    return profile.aliases.some((alias) => alias.trim().toLowerCase() === normalized);
  });
}

export function getGenericCityProfile(cityName: string): CityProfile {
  return {
    city: cityName,
    aliases: [],
    baseCoordinates: { lng: 120, lat: 30 },
    coreAreas: [`${cityName}中心片区`, `${cityName}老城片区`, `${cityName}滨水片区`],
    recommendedPoiSeeds: [
      buildPoiSeed(cityName, `${cityName}老城步行片区`, ["history", "food", "slow"], ["老城漫游", "小吃补给", "本地感"], `适合用步行方式感受${cityName}的老城和小吃氛围。`, 120),
      buildPoiSeed(cityName, `${cityName}城市博物馆候选点`, ["museum", "history", "low_walk"], ["室内停留", "背景补充", "适合避暑"], `适合补足${cityName}的人文背景，适配少走路需求。`, 90),
      buildPoiSeed(cityName, `${cityName}滨水步道候选点`, ["sea", "nature", "photo", "slow"], ["看水景", "轻松散步", "傍晚友好"], `适合安排${cityName}的轻松散步和拍照段落。`, 120),
      buildPoiSeed(cityName, `${cityName}市场小吃片区候选点`, ["food", "shopping", "low_walk"], ["集中补给", "烟火感", "预算友好"], `适合集中解决用餐和补给，强调${cityName}的生活感。`, 75),
      buildPoiSeed(cityName, `${cityName}城市公园候选点`, ["nature", "slow", "photo"], ["留白休息", "轻度散步", "适合放慢"], `适合作为${cityName}路线中的留白段和休息节点。`, 90),
      buildPoiSeed(cityName, `${cityName}夜间街区候选点`, ["nightlife", "food", "photo"], ["夜间游逛", "灯光氛围", "轻松结束一天"], `适合安排在傍晚到夜间，补充${cityName}的晚间体验。`, 90),
    ],
    foodKeywords: ["市场小吃", "老街补给", "本地餐食"],
    photoKeywords: ["街景", "傍晚灯光", "城市界面"],
    historyKeywords: ["老城片区", "城市记忆", "人文地标"],
    natureKeywords: ["公园", "滨水步道", "轻松散步"],
    seaKeywords: ["滨水视角", "码头感", "开放景观"],
    transitNotes: [`优先按${cityName}片区组织路线，减少折返。`],
    budgetNotes: [`低预算优先考虑${cityName}的步行片区、市场和公共空间。`],
    avoidNotes: [`避免把${cityName}多个分散区域压在同一天。`],
  };
}
