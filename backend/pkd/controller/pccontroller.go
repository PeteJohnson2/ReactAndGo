/*
  - Copyright 2022 Sven Loesekann
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
package controller

import (
	"net/http"
	postcode "react-and-go/pkd/postcode"

	"github.com/gin-gonic/gin"
)

func getCountyDataByIdWithTimeSlots(c *gin.Context) {
	myPostcode := c.Param("postcode")
	myCountyData := postcode.FindCountyTimeSlotByPostcode(myPostcode)
	c.JSON(http.StatusOK, myCountyData)
}
