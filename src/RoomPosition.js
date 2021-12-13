RoomPosition.serialize = function(pos) {
    let x = pos.x
    let y = pos.y
    let name = pos.roomName
    
    if (x < 10) {
        x = '0' + String(x)
    }
    if (y < 10) {
        y = '0' + String(y)
    }
    return String(String(x) + String(y) + name)
}
RoomPosition.deserialize = function(pos) {
    let x = Number(pos.substring(0, 2))
    let y = Number(pos.substring(2, 4))
    let name = String(pos.substring(4, pos.length))
    
    return new RoomPosition(x, y, name)
}