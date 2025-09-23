const { Router } = require('express');
const { fetchLiveList, destroyRoom, getRoomInfo, getUserInfo } = require('../services/api.js');
const { updateAvatarUrl } = require('../utils/index.js');

const apiRouter = Router();

apiRouter.post('/get_live_list', async (req, res) => {
  const { next, count } = req.body;
  try {
    const response = await fetchLiveList(String(next), Number(count));
    res.send(response);
  } catch (error) {
    res.send(error);
  }
});

apiRouter.post('/destroy_room', async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) {
    res.json({ code: -1, message: 'roomId is required' });
    return;
  }
  try {
    const response = await destroyRoom(String(roomId));
    res.send(response);
  } catch (error) {
    res.send(error);
  }
});

apiRouter.post('/get_room_info', async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) {
    res.json({ code: -1, message: 'roomId is required' });
    return;
  }
  try {
    const response = await getRoomInfo(String(roomId));
    const userInfo = await getUserInfo(String(response.Response.RoomInfo.Owner_Account));
    response.Response.RoomInfo.AvatarUrl = updateAvatarUrl(response.Response.RoomInfo.Owner_Account, userInfo);
    res.send(response);
  } catch (error) {
    res.send(error);
  }
});

// 测试请求是否成功的接口
apiRouter.get('/test', (_, res) => {
  res.json({
    result: 'success',
  });
});

module.exports = { apiRouter };
